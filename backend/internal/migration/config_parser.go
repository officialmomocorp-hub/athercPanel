package migration

import (
	"fmt"
	"io/ioutil"
	"path/filepath"
	"regexp"
	"strings"
)

// ConfigParser provides regex utilities to parse and rewrite application configurations.
type ConfigParser struct{}

// NewConfigParser creates a configuration parser.
func NewConfigParser() *ConfigParser {
	return &ConfigParser{}
}

// UpdateDatabaseConfig auto-detects configuration type and rewrites its credentials.
func (p *ConfigParser) UpdateDatabaseConfig(filePath, host, port, dbName, username, password string) error {
	contentBytes, err := ioutil.ReadFile(filePath)
	if err != nil {
		return fmt.Errorf("failed to read config file: %w", err)
	}
	content := string(contentBytes)
	baseName := strings.ToLower(filepath.Base(filePath))

	var updatedContent string
	if baseName == "wp-config.php" {
		updatedContent, err = p.UpdateWPConfig(content, host, dbName, username, password)
	} else if baseName == ".env" {
		updatedContent, err = p.UpdateEnvFile(content, host, port, dbName, username, password)
	} else {
		// Generic parser or custom configuration formats
		updatedContent, err = p.UpdateGenericConfig(content, dbName, username, password)
	}

	if err != nil {
		return err
	}

	// Write back configuration changes
	err = ioutil.WriteFile(filePath, []byte(updatedContent), 0644)
	if err != nil {
		return fmt.Errorf("failed to write updated config file: %w", err)
	}

	return nil
}

// UpdateWPConfig processes a wp-config.php source string and swaps out the DB define constants.
func (p *ConfigParser) UpdateWPConfig(content, host, dbName, username, password string) (string, error) {
	// Pattern to match: define( 'DB_NAME', '...' ); or define("DB_NAME", "...");
	// Handles arbitrary spacing, single/double quotes, and optional line comments.
	reDBName := regexp.MustCompile(`(?i)(define\s*\(\s*['"]DB_NAME['"]\s*,\s*['"])(.*?)(['"]\s*\)\s*;)`)
	reDBUser := regexp.MustCompile(`(?i)(define\s*\(\s*['"]DB_USER['"]\s*,\s*['"])(.*?)(['"]\s*\)\s*;)`)
	reDBPass := regexp.MustCompile(`(?i)(define\s*\(\s*['"]DB_PASSWORD['"]\s*,\s*['"])(.*?)(['"]\s*\)\s*;)`)
	reDBHost := regexp.MustCompile(`(?i)(define\s*\(\s*['"]DB_HOST['"]\s*,\s*['"])(.*?)(['"]\s*\)\s*;)`)

	replaceFunc := func(re *regexp.Regexp, newVal string) func(string) string {
		return func(match string) string {
			groups := re.FindStringSubmatch(match)
			if len(groups) == 4 {
				return groups[1] + newVal + groups[3]
			}
			return match
		}
	}

	content = reDBName.ReplaceAllStringFunc(content, replaceFunc(reDBName, dbName))
	content = reDBUser.ReplaceAllStringFunc(content, replaceFunc(reDBUser, username))
	content = reDBPass.ReplaceAllStringFunc(content, replaceFunc(reDBPass, password))
	content = reDBHost.ReplaceAllStringFunc(content, replaceFunc(reDBHost, host))

	return content, nil
}

// UpdateEnvFile parses key-value pairings inside a .env file and adjusts Database variables.
func (p *ConfigParser) UpdateEnvFile(content, host, port, dbName, username, password string) (string, error) {
	// Targets DB_HOST, DB_PORT, DB_DATABASE (or DB_DB), DB_USERNAME, DB_PASSWORD
	replacements := map[string]string{
		"DB_HOST":     host,
		"DB_PORT":     port,
		"DB_DATABASE": dbName,
		"DB_DB":       dbName, // Supporting frameworks with DB_DB variation
		"DB_USERNAME": username,
		"DB_USER":     username,
		"DB_PASSWORD": password,
		"DB_PASS":     password,
	}

	lines := strings.Split(content, "\n")
	for i, line := range lines {
		trimmed := strings.TrimSpace(line)
		if trimmed == "" || strings.HasPrefix(trimmed, "#") {
			continue
		}

		parts := strings.SplitN(line, "=", 2)
		if len(parts) != 2 {
			continue
		}

		key := strings.TrimSpace(parts[0])
		if newVal, ok := replacements[key]; ok {
			// Maintain original quoting structure if any
			origVal := strings.TrimSpace(parts[1])
			quoteChar := ""
			if strings.HasPrefix(origVal, `"`) && strings.HasSuffix(origVal, `"`) {
				quoteChar = `"`
			} else if strings.HasPrefix(origVal, `'`) && strings.HasSuffix(origVal, `'`) {
				quoteChar = `'`
			}
			
			lines[i] = fmt.Sprintf("%s=%s%s%s", key, quoteChar, newVal, quoteChar)
		}
	}

	return strings.Join(lines, "\n"), nil
}

// UpdateGenericConfig replaces passwords and DB names from arbitrary PHP files or YAML if matching keywords occur.
func (p *ConfigParser) UpdateGenericConfig(content, dbName, username, password string) (string, error) {
	// Fallback scanning. Searches for key phrases inside structures.
	// For instance, JSON/YAML elements like "db_name": "value" or db_name: value
	reDB := regexp.MustCompile(`(?i)(db_?name\s*[:=>]\s*['"]?)([^'"\s,]+)(['"]?)`)
	reUser := regexp.MustCompile(`(?i)(db_?user(?:name)?\s*[:=>]\s*['"]?)([^'"\s,]+)(['"]?)`)
	rePass := regexp.MustCompile(`(?i)(db_?pass(?:word)?\s*[:=>]\s*['"]?)([^'"\s,]+)(['"]?)`)

	replaceFunc := func(re *regexp.Regexp, newVal string) func(string) string {
		return func(match string) string {
			groups := re.FindStringSubmatch(match)
			if len(groups) == 4 {
				return groups[1] + newVal + groups[3]
			}
			return match
		}
	}

	content = reDB.ReplaceAllStringFunc(content, replaceFunc(reDB, dbName))
	content = reUser.ReplaceAllStringFunc(content, replaceFunc(reUser, username))
	content = rePass.ReplaceAllStringFunc(content, replaceFunc(rePass, password))

	return content, nil
}

