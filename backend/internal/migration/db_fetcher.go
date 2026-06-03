package migration

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"net"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"time"

	"golang.org/x/crypto/ssh"
)

// DBType represents the engine of the SQL database.
type DBType string

const (
	MySQL      DBType = "mysql"
	PostgreSQL DBType = "postgres"
)

// DatabaseCredentials contains access info for the source database.
type DatabaseCredentials struct {
	Type     DBType
	Host     string // e.g. "127.0.0.1" or "localhost" from remote's perspective
	Port     int    // e.g. 3306 or 5432
	Username string
	Password string
	DBName   string
}

// DatabaseFetcher orchestrates remote database retrieval.
type DatabaseFetcher struct {
	creds     DatabaseCredentials
	sshClient *ssh.Client
}

// NewDatabaseFetcher creates a database fetcher. If sshClient is nil, it connects directly.
func NewDatabaseFetcher(creds DatabaseCredentials, sshClient *ssh.Client) *DatabaseFetcher {
	return &DatabaseFetcher{
		creds:     creds,
		sshClient: sshClient,
	}
}

// FetchAndRestore dumps the remote database, downloads it, and imports it locally.
func (s *DatabaseFetcher) FetchAndRestore(ctx context.Context, localDBUser, localDBPass, localDBName string) error {
	tmpDir := os.TempDir()
	dumpFileName := fmt.Sprintf("db_dump_%s_%d.sql", s.creds.DBName, time.Now().Unix())
	localDumpPath := filepath.Join(tmpDir, dumpFileName)
	defer os.Remove(localDumpPath)

	// 1. Dump remote database
	if s.sshClient != nil {
		// Method A: SSH Shell available. Run mysqldump/pg_dump on remote system directly.
		err := s.fetchViaRemoteDump(ctx, localDumpPath)
		if err != nil {
			// Method B: Fallback to SSH Tunneling if command fails or binaries missing on remote
			errTunnel := s.fetchViaSSHTunnel(ctx, localDumpPath)
			if errTunnel != nil {
				return fmt.Errorf("both remote execution and SSH tunneling failed. remote error: %v, tunnel error: %v", err, errTunnel)
			}
		}
	} else {
		// Method C: Direct remote database connection (No SSH)
		err := s.fetchDirectConnection(ctx, localDumpPath)
		if err != nil {
			return fmt.Errorf("failed to fetch database directly: %w", err)
		}
	}

	// 2. Import locally to local MySQL/PostgreSQL
	err := s.restoreLocal(ctx, localDumpPath, localDBUser, localDBPass, localDBName)
	if err != nil {
		return fmt.Errorf("failed to restore database locally: %w", err)
	}

	return nil
}

// fetchViaRemoteDump executes dump on remote SSH host and pipes/downloads the file.
func (s *DatabaseFetcher) fetchViaRemoteDump(ctx context.Context, localDumpPath string) error {
	session, err := s.sshClient.NewSession()
	if err != nil {
		return err
	}
	defer session.Close()

	var cmd string
	switch s.creds.Type {
	case MySQL:
		cmd = fmt.Sprintf("MYSQL_PWD='%s' mysqldump -h %s -P %d -u %s --single-transaction --quick --skip-lock-tables %s",
			s.creds.Password, s.creds.Host, s.creds.Port, s.creds.Username, s.creds.DBName)
	case PostgreSQL:
		cmd = fmt.Sprintf("PGPASSWORD='%s' pg_dump -h %s -p %d -U %s -d %s -F p",
			s.creds.Password, s.creds.Host, s.creds.Port, s.creds.Username, s.creds.DBName)
	default:
		return fmt.Errorf("unsupported database type: %s", s.creds.Type)
	}

	outFile, err := os.Create(localDumpPath)
	if err != nil {
		return err
	}
	defer outFile.Close()

	session.Stdout = outFile
	
	// Capture stderr for error tracking
	var errBuf bytes.Buffer
	session.Stderr = &errBuf

	err = session.Run(cmd)
	if err != nil {
		return fmt.Errorf("remote dump command execution failed: %w (stderr: %s)", err, errBuf.String())
	}

	return nil
}

// fetchViaSSHTunnel creates a local port forwarder, routes dump through local client.
func (s *DatabaseFetcher) fetchViaSSHTunnel(ctx context.Context, localDumpPath string) error {
	// Listen on random local port
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		return err
	}
	defer listener.Close()

	localPort := listener.Addr().(*net.TCPAddr).Port
	remoteAddr := fmt.Sprintf("%s:%d", s.creds.Host, s.creds.Port)

	// Accept connections in background and channel them over SSH
	errChan := make(chan error, 1)
	go func() {
		for {
			localConn, err := listener.Accept()
			if err != nil {
				return
			}
			go func(lConn net.Conn) {
				defer lConn.Close()
				remoteConn, err := s.sshClient.Dial("tcp", remoteAddr)
				if err != nil {
					select {
					case errChan <- fmt.Errorf("failed to dial remote DB address: %w", err):
					default:
					}
					return
				}
				defer remoteConn.Close()

				// Bidirectional copy
				go io.Copy(remoteConn, lConn)
				io.Copy(lConn, remoteConn)
			}(localConn)
		}
	}()

	// Give the tunnel half a second to settle
	time.Sleep(500 * time.Millisecond)

	// Execute local dump utility connecting to 127.0.0.1:localPort
	var localCmd *exec.Cmd
	switch s.creds.Type {
	case MySQL:
		localCmd = exec.CommandContext(ctx, "mysqldump",
			"-h", "127.0.0.1",
			"-P", strconv.Itoa(localPort),
			"-u", s.creds.Username,
			"--single-transaction",
			"--quick",
			"--skip-lock-tables",
			s.creds.DBName,
		)
		localCmd.Env = append(os.Environ(), fmt.Sprintf("MYSQL_PWD=%s", s.creds.Password))
	case PostgreSQL:
		localCmd = exec.CommandContext(ctx, "pg_dump",
			"-h", "127.0.0.1",
			"-p", strconv.Itoa(localPort),
			"-U", s.creds.Username,
			"-d", s.creds.DBName,
			"-F", "p",
		)
		localCmd.Env = append(os.Environ(), fmt.Sprintf("PGPASSWORD=%s", s.creds.Password))
	default:
		return fmt.Errorf("unsupported database type: %s", s.creds.Type)
	}

	outFile, err := os.Create(localDumpPath)
	if err != nil {
		return err
	}
	defer outFile.Close()

	localCmd.Stdout = outFile
	if err := localCmd.Run(); err != nil {
		select {
		case tunnelErr := <-errChan:
			return fmt.Errorf("tunnel crash: %v, dump error: %w", tunnelErr, err)
		default:
			return fmt.Errorf("local dump execution via tunnel failed: %w", err)
		}
	}

	return nil
}

// fetchDirectConnection downloads DB without SSH.
func (s *DatabaseFetcher) fetchDirectConnection(ctx context.Context, localDumpPath string) error {
	var localCmd *exec.Cmd
	switch s.creds.Type {
	case MySQL:
		localCmd = exec.CommandContext(ctx, "mysqldump",
			"-h", s.creds.Host,
			"-P", strconv.Itoa(s.creds.Port),
			"-u", s.creds.Username,
			fmt.Sprintf("-p%s", s.creds.Password),
			"--single-transaction",
			s.creds.DBName,
		)
	case PostgreSQL:
		localCmd = exec.CommandContext(ctx, "pg_dump",
			"-h", s.creds.Host,
			"-p", strconv.Itoa(s.creds.Port),
			"-U", s.creds.Username,
			"-d", s.creds.DBName,
		)
		localCmd.Env = append(os.Environ(), fmt.Sprintf("PGPASSWORD=%s", s.creds.Password))
	default:
		return fmt.Errorf("unsupported database type: %s", s.creds.Type)
	}

	outFile, err := os.Create(localDumpPath)
	if err != nil {
		return err
	}
	defer outFile.Close()

	localCmd.Stdout = outFile
	return localCmd.Run()
}

// restoreLocal imports the downloaded dump file into the local VPS instance.
func (s *DatabaseFetcher) restoreLocal(ctx context.Context, dumpFilePath, localUser, localPass, localDBName string) error {
	// First ensure database exists locally
	createDBCmd := exec.CommandContext(ctx, "mysql", "-u", localUser, fmt.Sprintf("-p%s", localPass), "-e", fmt.Sprintf("CREATE DATABASE IF NOT EXISTS %s CHARSET utf8mb4 COLLATE utf8mb4_unicode_ci;", localDBName))
	_ = createDBCmd.Run() // Let's try creating, ignore if exists or user permissions restrict direct creation

	// Run import
	importCmd := exec.CommandContext(ctx, "mysql", "-u", localUser, fmt.Sprintf("-p%s", localPass), localDBName)
	
	inFile, err := os.Open(dumpFilePath)
	if err != nil {
		return err
	}
	defer inFile.Close()
	
	importCmd.Stdin = inFile
	return importCmd.Run()
}
