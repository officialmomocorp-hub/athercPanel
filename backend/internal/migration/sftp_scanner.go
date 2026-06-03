package migration

import (
	"archive/tar"
	"compress/gzip"
	"context"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/pkg/sftp"
	"golang.org/x/crypto/ssh"
)

// MigrationCredentials contains access details for the source server.
type MigrationCredentials struct {
	Host           string
	Port           int
	Username       string
	Password       string
	PrivateKey     string // Optional
	Passphrase     string // Optional
	RemotePathHint string // Optional starting directory
}

// SFTPMigrationScanner orchestrates remote scans, compression, and download.
type SFTPMigrationScanner struct {
	creds      MigrationCredentials
	sshClient  *ssh.Client
	sftpClient *sftp.Client
}

// NewSFTPMigrationScanner creates a new instance of the scanner.
func NewSFTPMigrationScanner(creds MigrationCredentials) *SFTPMigrationScanner {
	return &SFTPMigrationScanner{creds: creds}
}

// Connect establishes both SSH and SFTP connections.
func (s *SFTPMigrationScanner) Connect() error {
	var authMethods []ssh.AuthMethod

	if s.creds.PrivateKey != "" {
		var signer ssh.Signer
		var err error
		if s.creds.Passphrase != "" {
			signer, err = ssh.ParsePrivateKeyWithPassphrase([]byte(s.creds.PrivateKey), []byte(s.creds.Passphrase))
		} else {
			signer, err = ssh.ParsePrivateKey([]byte(s.creds.PrivateKey))
		}
		if err != nil {
			return fmt.Errorf("failed to parse private key: %w", err)
		}
		authMethods = append(authMethods, ssh.PublicKeys(signer))
	}

	if s.creds.Password != "" {
		authMethods = append(authMethods, ssh.Password(s.creds.Password))
	}

	sshConfig := &ssh.ClientConfig{
		User:            s.creds.Username,
		Auth:            authMethods,
		HostKeyCallback: ssh.InsecureIgnoreHostKey(), // In production, we'd want to pin hosts or prompt
		Timeout:         30 * time.Second,
	}

	addr := fmt.Sprintf("%s:%d", s.creds.Host, s.creds.Port)
	client, err := ssh.Dial("tcp", addr, sshConfig)
	if err != nil {
		return fmt.Errorf("failed to connect to SSH server %s: %w", addr, err)
	}
	s.sshClient = client

	sftpClient, err := sftp.NewClient(client)
	if err != nil {
		client.Close()
		return fmt.Errorf("failed to initialize SFTP client: %w", err)
	}
	s.sftpClient = sftpClient

	return nil
}

// Close closes active remote connection pools.
func (s *SFTPMigrationScanner) Close() {
	if s.sftpClient != nil {
		s.sftpClient.Close()
	}
	if s.sshClient != nil {
		s.sshClient.Close()
	}
}

// AutoDiscoverWebRoot scans the remote directories to auto-detect the web root (e.g. public_html, httpdocs, var/www/html).
// Returns the absolute remote path of the discovered web root.
func (s *SFTPMigrationScanner) AutoDiscoverWebRoot(ctx context.Context) (string, error) {
	startDir := s.creds.RemotePathHint
	if startDir == "" {
		var err error
		startDir, err = s.sftpClient.Getwd()
		if err != nil {
			startDir = "/"
		}
	}

	// Signatures of common web layouts
	webSignatures := []string{
		"wp-config.php",
		"index.php",
		"index.html",
		".env",
		"package.json",
	}

	// Standard web-root directories to look out for first (for efficiency)
	commonWebRoots := []string{
		"public_html",
		"httpdocs",
		"public",
		"www",
		"var/www/html",
		"web",
	}

	// 1. Fast check: See if any of the common directories exist under starting directory
	for _, sub := range commonWebRoots {
		target := filepath.ToSlash(filepath.Join(startDir, sub))
		if stat, err := s.sftpClient.Stat(target); err == nil && stat.IsDir() {
			// Check if it contains any signature file
			files, _ := s.sftpClient.ReadDir(target)
			for _, file := range files {
				for _, sig := range webSignatures {
					if file.Name() == sig {
						return target, nil
					}
				}
			}
		}
	}

	// 2. Deep scan: walk the directory structure up to 4 levels deep
	type walkItem struct {
		path  string
		depth int
	}

	queue := []walkItem{{path: startDir, depth: 0}}
	for len(queue) > 0 {
		select {
		case <-ctx.Done():
			return "", ctx.Err()
		default:
		}

		current := queue[0]
		queue = queue[1:]

		if current.depth > 4 {
			continue
		}

		// Avoid system-level directories that can't be web roots
		base := filepath.Base(current.path)
		if strings.HasPrefix(base, ".") || base == "bin" || base == "etc" || base == "lib" || base == "dev" || base == "sys" || base == "proc" || base == "tmp" {
			continue
		}

		files, err := s.sftpClient.ReadDir(current.path)
		if err != nil {
			continue // Skip directories we can't read
		}

		hasSignature := false
		var subDirs []string

		for _, file := range files {
			if file.IsDir() {
				subDirs = append(subDirs, filepath.ToSlash(filepath.Join(current.path, file.Name())))
			} else {
				for _, sig := range webSignatures {
					if file.Name() == sig {
						hasSignature = true
					}
				}
			}
		}

		if hasSignature {
			return current.path, nil
		}

		// Queue subdirectories for level-by-level traversal (BFS)
		for _, sd := range subDirs {
			queue = append(queue, walkItem{path: sd, depth: current.depth + 1})
		}
	}

	return "", fmt.Errorf("web root could not be automatically discovered starting from %s", startDir)
}

// CompressAndDownload streams remote files by zipping/tarring them on the remote side (fast)
// and downloading to local path. Fallbacks to pure SFTP recursive file fetching if remote commands are restricted.
func (s *SFTPMigrationScanner) CompressAndDownload(ctx context.Context, remoteWebRoot, localTargetDir string) error {
	// Ensure local directory exists
	if err := os.MkdirAll(localTargetDir, 0755); err != nil {
		return fmt.Errorf("failed to create local target directory: %w", err)
	}

	// Attempt remote zip/tar execution via SSH session first (drastically saves bandwidth)
	session, err := s.sshClient.NewSession()
	if err == nil {
		defer session.Close()
		tmpTarPath := fmt.Sprintf("/tmp/aether_migration_%d.tar.gz", time.Now().Unix())
		
		// Tar command: exclude common bulky files if needed
		cmd := fmt.Sprintf("tar -czf %s -C %s .", tmpTarPath, remoteWebRoot)
		if err := session.Run(cmd); err == nil {
			// Download the remote tarball
			errDownload := s.downloadFile(ctx, tmpTarPath, filepath.Join(localTargetDir, "archive.tar.gz"))
			
			// Clean up remote tarball in background
			cleanupSession, cErr := s.sshClient.NewSession()
			if cErr == nil {
				_ = cleanupSession.Run(fmt.Sprintf("rm -f %s", tmpTarPath))
				cleanupSession.Close()
			}

			if errDownload == nil {
				// Extract locally
				errExtract := extractTarGz(filepath.Join(localTargetDir, "archive.tar.gz"), localTargetDir)
				_ = os.Remove(filepath.Join(localTargetDir, "archive.tar.gz")) // clean local tar
				return errExtract
			}
		}
	}

	// Fallback: Pure SFTP recursive download if SSH shell is disabled
	return s.recursiveSFTPDownload(ctx, remoteWebRoot, localTargetDir)
}

// downloadFile copies a file from remote server to local machine via SFTP.
func (s *SFTPMigrationScanner) downloadFile(ctx context.Context, remotePath, localPath string) error {
	srcFile, err := s.sftpClient.Open(remotePath)
	if err != nil {
		return err
	}
	defer srcFile.Close()

	dstFile, err := os.OpenFile(localPath, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, 0644)
	if err != nil {
		return err
	}
	defer dstFile.Close()

	// Implement chunked transfer with context cancellation checks
	buf := make([]byte, 1024*64) // 64kb buffer
	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
		}

		n, err := srcFile.Read(buf)
		if n > 0 {
			if _, wErr := dstFile.Write(buf[:n]); wErr != nil {
				return wErr
			}
		}
		if err == io.EOF {
			break
		}
		if err != nil {
			return err
		}
	}
	return nil
}

// recursiveSFTPDownload fetches files recursively using SFTP operations.
func (s *SFTPMigrationScanner) recursiveSFTPDownload(ctx context.Context, remoteDir, localDir string) error {
	walker := s.sftpClient.Walk(remoteDir)
	for walker.Step() {
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
		}

		if walker.Err() != nil {
			continue
		}

		relPath, err := filepath.Rel(remoteDir, walker.Path())
		if err != nil {
			return err
		}

		localPath := filepath.Join(localDir, relPath)
		info := walker.Stat()

		if info.IsDir() {
			if err := os.MkdirAll(localPath, 0755); err != nil {
				return err
			}
		} else {
			// Ensure parent dir exists
			if err := os.MkdirAll(filepath.Dir(localPath), 0755); err != nil {
				return err
			}
			if err := s.downloadFile(ctx, walker.Path(), localPath); err != nil {
				return err
			}
		}
	}
	return nil
}

// Helper to extract a .tar.gz archive locally.
func extractTarGz(tarGzPath, targetDir string) error {
	file, err := os.Open(tarGzPath)
	if err != nil {
		return err
	}
	defer file.Close()

	gzReader, err := gzip.NewReader(file)
	if err != nil {
		return err
	}
	defer gzReader.Close()

	tarReader := tar.NewReader(gzReader)
	for {
		header, err := tarReader.Next()
		if err == io.EOF {
			break
		}
		if err != nil {
			return err
		}

		// Prevent ZipSlip / Directory Traversal attacks
		cleaned := filepath.Clean(header.Name)
		if strings.HasPrefix(cleaned, "..") || strings.HasPrefix(cleaned, "/") {
			continue
		}

		target := filepath.Join(targetDir, cleaned)
		switch header.Typeflag {
		case tar.TypeDir:
			if err := os.MkdirAll(target, 0755); err != nil {
				return err
			}
		case tar.TypeReg:
			if err := os.MkdirAll(filepath.Dir(target), 0755); err != nil {
				return err
			}
			outFile, err := os.OpenFile(target, os.O_CREATE|os.O_RDWR|os.O_TRUNC, os.FileMode(header.Mode))
			if err != nil {
				return err
			}
			if _, err := io.Copy(outFile, tarReader); err != nil {
				outFile.Close()
				return err
			}
			outFile.Close()
		}
	}
	return nil
}

// SSHClient exposes the underlying SSH client connection.
func (s *SFTPMigrationScanner) SSHClient() *ssh.Client {
	return s.sshClient
}

