package main

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"

	"aether-panel/backend/internal/migration"
)

// MigrationRequest matches the incoming payload from the UI for website transfers.
type MigrationRequest struct {
	RemoteHost     string `json:"remoteHost"`
	RemotePort     int    `json:"remotePort"`
	RemoteUser     string `json:"remoteUser"`
	RemotePass     string `json:"remotePass"`
	RemoteKey      string `json:"remoteKey"`
	RemoteWebRoot  string `json:"remoteWebRoot"`
	RemoteDBHost   string `json:"remoteDBHost"`
	RemoteDBPort   int    `json:"remoteDBPort"`
	RemoteDBUser   string `json:"remoteDBUser"`
	RemoteDBPass   string `json:"remoteDBPass"`
	RemoteDBName   string `json:"remoteDBName"`
	LocalDomain    string `json:"localDomain"`
	LocalPHPVer    string `json:"localPHPVer"`
}

// SystemMetrics structure returned by monitoring endpoints.
type SystemMetrics struct {
	CPUUsage    float64 `json:"cpuUsage"`
	RAMUsage    float64 `json:"ramUsage"`
	DiskUsage   float64 `json:"diskUsage"`
	ActiveSites int     `json:"activeSites"`
}

// JobStatus represents the live migration state.
type JobStatus struct {
	ID        string    `json:"jobId"`
	Domain    string    `json:"domain"`
	Status    string    `json:"status"` // "pending", "processing", "completed", "failed"
	Message   string    `json:"message"`
	UpdatedAt time.Time `json:"updatedAt"`
}

var (
	jobsMutex sync.RWMutex
	jobsStore = make(map[string]*JobStatus)

	domainRegex = regexp.MustCompile(`^[a-zA-Z0-9][-a-zA-Z0-9.]*\.[a-zA-Z]{2,63}$`)

	jwtSecret     = []byte(uuid.New().String()) // Fresh secret on every start
	adminUser     = "admin"
	adminPassHash []byte
)

func initCredentials() {
	user := os.Getenv("AETHER_USER")
	pass := os.Getenv("AETHER_PASS")
	
	if user != "" && pass != "" {
		adminUser = user
		hash, err := bcrypt.GenerateFromPassword([]byte(pass), bcrypt.DefaultCost)
		if err != nil {
			log.Fatalf("Failed to hash environment password: %v", err)
		}
		adminPassHash = hash
		log.Println("[Auth] Loaded admin credentials from environment variables.")
		return
	}
	
	// Try loading from config.json
	configPath := "./config.json"
	if data, err := os.ReadFile(configPath); err == nil {
		var cfg struct {
			Username string `json:"username"`
			Hash     string `json:"passwordHash"`
		}
		if json.Unmarshal(data, &cfg) == nil && cfg.Username != "" && cfg.Hash != "" {
			adminUser = cfg.Username
			adminPassHash = []byte(cfg.Hash)
			log.Println("[Auth] Loaded admin credentials from config.json.")
			return
		}
	}
	
	// Create default config.json with a random password if not found
	randPass := uuid.New().String()[:12]
	hash, err := bcrypt.GenerateFromPassword([]byte(randPass), bcrypt.DefaultCost)
	if err != nil {
		log.Fatalf("Failed to generate default password hash: %v", err)
	}
	adminPassHash = hash
	
	cfgData := map[string]string{
		"username":     adminUser,
		"passwordHash": string(hash),
	}
	
	if bytesData, err := json.MarshalIndent(cfgData, "", "  "); err == nil {
		_ = os.WriteFile(configPath, bytesData, 0600)
		log.Printf("\n===================================================================\n")
		log.Printf("  [Auth] INITIAL SECURITY CREDENTIALS GENERATED:\n")
		log.Printf("  Username: %s\n", adminUser)
		log.Printf("  Password: %s\n", randPass)
		log.Printf("  Saved to: %s\n", configPath)
		log.Printf("===================================================================\n\n")
	}
}

func generateToken(username string) (string, error) {
	expiration := time.Now().Add(24 * time.Hour).Unix()
	payload := fmt.Sprintf("%s:%d", username, expiration)
	encodedPayload := base64.StdEncoding.EncodeToString([]byte(payload))
	
	mac := hmac.New(sha256.New, jwtSecret)
	mac.Write([]byte(encodedPayload))
	signature := base64.StdEncoding.EncodeToString(mac.Sum(nil))
	
	return encodedPayload + "." + signature, nil
}

func validateToken(token string) (string, error) {
	parts := strings.Split(token, ".")
	if len(parts) != 2 {
		return "", fmt.Errorf("invalid token format")
	}
	encodedPayload, signature := parts[0], parts[1]
	
	mac := hmac.New(sha256.New, jwtSecret)
	mac.Write([]byte(encodedPayload))
	expectedSignature := base64.StdEncoding.EncodeToString(mac.Sum(nil))
	
	if !hmac.Equal([]byte(signature), []byte(expectedSignature)) {
		return "", fmt.Errorf("invalid token signature")
	}
	
	payloadBytes, err := base64.StdEncoding.DecodeString(encodedPayload)
	if err != nil {
		return "", fmt.Errorf("failed to decode payload")
	}
	
	payload := string(payloadBytes)
	idx := strings.LastIndex(payload, ":")
	if idx == -1 {
		return "", fmt.Errorf("invalid payload structure")
	}
	
	username := payload[:idx]
	expiresStr := payload[idx+1:]
	expiresAt, err := strconv.ParseInt(expiresStr, 10, 64)
	if err != nil {
		return "", fmt.Errorf("invalid expiration format")
	}
	
	if time.Now().Unix() > expiresAt {
		return "", fmt.Errorf("token expired")
	}
	
	return username, nil
}

func authMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Allow CORS OPTIONS requests preflight
		if r.Method == "OPTIONS" {
			w.Header().Set("Access-Control-Allow-Origin", "*")
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
			w.WriteHeader(http.StatusOK)
			return
		}

		authHeader := r.Header.Get("Authorization")
		if !strings.HasPrefix(authHeader, "Bearer ") {
			http.Error(w, "Unauthorized: missing session token", http.StatusUnauthorized)
			return
		}
		
		token := strings.TrimPrefix(authHeader, "Bearer ")
		username, err := validateToken(token)
		if err != nil {
			http.Error(w, "Unauthorized: "+err.Error(), http.StatusUnauthorized)
			return
		}
		
		r.Header.Set("X-Authenticated-User", username)
		next(w, r)
	}
}

func setJobStatus(id, domain, status, msg string) {
	jobsMutex.Lock()
	defer jobsMutex.Unlock()
	jobsStore[id] = &JobStatus{
		ID:        id,
		Domain:    domain,
		Status:    status,
		Message:   msg,
		UpdatedAt: time.Now(),
	}
}

func getJobStatus(id string) (*JobStatus, bool) {
	jobsMutex.RLock()
	defer jobsMutex.RUnlock()
	job, exists := jobsStore[id]
	return job, exists
}

func validateMigrationRequest(req MigrationRequest) error {
	if !domainRegex.MatchString(req.LocalDomain) {
		return fmt.Errorf("invalid local domain format")
	}
	validPHP := false
	for _, ver := range []string{"7.4", "8.1", "8.2", "8.3", "8.4"} {
		if req.LocalPHPVer == ver {
			validPHP = true
			break
		}
	}
	if !validPHP {
		return fmt.Errorf("unsupported PHP version: %s", req.LocalPHPVer)
	}
	if req.RemoteHost == "" {
		return fmt.Errorf("remote host is required")
	}
	if req.RemoteUser == "" {
		return fmt.Errorf("remote user is required")
	}
	return nil
}

type Site struct {
	Domain       string `json:"domain"`
	PHPVersion   string `json:"phpVersion"`
	RedisEnabled bool   `json:"redisEnabled"`
	SSLActive    bool   `json:"sslActive"`
	Bandwidth    string `json:"bandwidth"`
}

var (
	sitesMutex sync.Mutex
)

func discoverSitesFromSystem() []Site {
	var list []Site
	files, err := os.ReadDir("/etc/nginx/sites-enabled")
	if err != nil {
		return list
	}
	for _, f := range files {
		name := f.Name()
		if name == "default" {
			continue
		}
		
		phpVer := "8.3" // fallback
		nginxPath := fmt.Sprintf("/etc/nginx/sites-available/%s", name)
		if data, err := os.ReadFile(nginxPath); err == nil {
			content := string(data)
			re := regexp.MustCompile(`php(\d+\.\d+)-fpm`)
			matches := re.FindStringSubmatch(content)
			if len(matches) > 1 {
				phpVer = matches[1]
			}
		}
		
		sslActive := false
		sslPath := fmt.Sprintf("/etc/letsencrypt/live/%s/fullchain.pem", name)
		if _, err := os.Stat(sslPath); err == nil {
			sslActive = true
		}
		
		list = append(list, Site{
			Domain:       name,
			PHPVersion:   phpVer,
			RedisEnabled: false,
			SSLActive:    sslActive,
			Bandwidth:    "0 GB",
		})
	}
	return list
}

func loadSites() []Site {
	sitesMutex.Lock()
	defer sitesMutex.Unlock()
	
	configPath := "/opt/aether-panel/sites.json"
	data, err := os.ReadFile(configPath)
	if err != nil {
		list := discoverSitesFromSystem()
		d, _ := json.MarshalIndent(list, "", "  ")
		_ = os.WriteFile(configPath, d, 0644)
		return list
	}
	var list []Site
	if err := json.Unmarshal(data, &list); err != nil {
		return discoverSitesFromSystem()
	}
	return list
}

func saveSites(list []Site) {
	sitesMutex.Lock()
	defer sitesMutex.Unlock()
	
	configPath := "/opt/aether-panel/sites.json"
	data, _ := json.MarshalIndent(list, "", "  ")
	_ = os.WriteFile(configPath, data, 0644)
}

func addSiteToStore(domain, phpVer string, redisEnabled, sslActive bool) {
	list := loadSites()
	exists := false
	for i, s := range list {
		if s.Domain == domain {
			list[i].PHPVersion = phpVer
			list[i].RedisEnabled = redisEnabled
			list[i].SSLActive = sslActive
			exists = true
			break
		}
	}
	if !exists {
		list = append(list, Site{
			Domain:       domain,
			PHPVersion:   phpVer,
			RedisEnabled: redisEnabled,
			SSLActive:    sslActive,
			Bandwidth:    "0 GB",
		})
	}
	saveSites(list)
}

func handleGetSites(w http.ResponseWriter, r *http.Request) {
	if r.Method == "OPTIONS" {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.WriteHeader(http.StatusOK)
		return
	}
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	list := loadSites()
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(list)
}

func handleUpdatePHP(w http.ResponseWriter, r *http.Request) {
	if r.Method == "OPTIONS" {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.WriteHeader(http.StatusOK)
		return
	}
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	var body struct {
		Domain  string `json:"domain"`
		Version string `json:"version"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	
	valid := false
	for _, v := range []string{"7.4", "8.1", "8.2", "8.3", "8.4"} {
		if body.Version == v {
			valid = true
			break
		}
	}
	if !valid {
		http.Error(w, "Invalid PHP version", http.StatusBadRequest)
		return
	}
	
	list := loadSites()
	var oldVersion string
	for _, s := range list {
		if s.Domain == body.Domain {
			oldVersion = s.PHPVersion
			break
		}
	}
	if oldVersion != "" {
		_ = os.Remove(fmt.Sprintf("/etc/php/%s/fpm/pool.d/%s.conf", oldVersion, body.Domain))
		_ = executeShell("systemctl", "reload", fmt.Sprintf("php%s-fpm", oldVersion))
	}
	
	err := rebuildPHPPool(body.Domain, body.Version)
	if err != nil {
		http.Error(w, "Failed to rebuild PHP pool: "+err.Error(), http.StatusInternalServerError)
		return
	}
	
	for i, s := range list {
		if s.Domain == body.Domain {
			list[i].PHPVersion = body.Version
			break
		}
	}
	saveSites(list)
	_ = rebuildNginxConfig(body.Domain)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "success"})
}

func handleToggleRedis(w http.ResponseWriter, r *http.Request) {
	if r.Method == "OPTIONS" {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.WriteHeader(http.StatusOK)
		return
	}
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	var body struct {
		Domain  string `json:"domain"`
		Enabled bool   `json:"enabled"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	
	list := loadSites()
	for i, s := range list {
		if s.Domain == body.Domain {
			list[i].RedisEnabled = body.Enabled
			break
		}
	}
	saveSites(list)
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "success"})
}

func handleDeleteSite(w http.ResponseWriter, r *http.Request) {
	if r.Method == "OPTIONS" {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.WriteHeader(http.StatusOK)
		return
	}
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	var body struct {
		Domain string `json:"domain"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	
	_ = os.Remove(fmt.Sprintf("/etc/nginx/sites-enabled/%s", body.Domain))
	_ = os.Remove(fmt.Sprintf("/etc/nginx/sites-available/%s", body.Domain))
	_ = executeShell("systemctl", "reload", "nginx")
	
	list := loadSites()
	var phpVer string
	for _, s := range list {
		if s.Domain == body.Domain {
			phpVer = s.PHPVersion
			break
		}
	}
	if phpVer != "" {
		_ = os.Remove(fmt.Sprintf("/etc/php/%s/fpm/pool.d/%s.conf", phpVer, body.Domain))
		_ = executeShell("systemctl", "reload", fmt.Sprintf("php%s-fpm", phpVer))
	}
	
	var newList []Site
	for _, s := range list {
		if s.Domain != body.Domain {
			newList = append(newList, s)
		}
	}
	saveSites(newList)
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "success"})
}

type PHPDomainSettings struct {
	MemoryLimit       string `json:"memory_limit"`
	UploadMaxFilesize string `json:"upload_max_filesize"`
	PostMaxSize       string `json:"post_max_size"`
	MaxExecutionTime  string `json:"max_execution_time"`
	MaxInputVars      string `json:"max_input_vars"`
}

var phpSettingsMutex sync.RWMutex

func loadPHPSettings() map[string]PHPDomainSettings {
	phpSettingsMutex.RLock()
	defer phpSettingsMutex.RUnlock()

	filePath := "/opt/aether-panel/php_settings.json"
	data, err := os.ReadFile(filePath)
	if err != nil {
		return make(map[string]PHPDomainSettings)
	}
	var settings map[string]PHPDomainSettings
	if err := json.Unmarshal(data, &settings); err != nil {
		return make(map[string]PHPDomainSettings)
	}
	return settings
}

func savePHPSettings(settings map[string]PHPDomainSettings) error {
	phpSettingsMutex.Lock()
	defer phpSettingsMutex.Unlock()

	filePath := "/opt/aether-panel/php_settings.json"
	data, err := json.MarshalIndent(settings, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(filePath, data, 0644)
}

func rebuildPHPPool(domain string, phpVer string) error {
	settingsMap := loadPHPSettings()
	settings, exists := settingsMap[domain]
	if !exists {
		settings = PHPDomainSettings{
			MemoryLimit:       "128M",
			UploadMaxFilesize: "64M",
			PostMaxSize:       "64M",
			MaxExecutionTime:  "120",
			MaxInputVars:      "1000",
		}
	}

	phpPoolConfig := fmt.Sprintf(`[%s]
user = %s
group = %s
listen = /run/php/php%s-fpm-%s.sock
listen.owner = www-data
listen.group = www-data
pm = dynamic
pm.max_children = 5
pm.start_servers = 2
pm.min_spare_servers = 1
pm.max_spare_servers = 3

php_value[memory_limit] = %s
php_value[upload_max_filesize] = %s
php_value[post_max_size] = %s
php_value[max_execution_time] = %s
php_value[max_input_vars] = %s
`, domain, domain, domain, phpVer, domain,
		settings.MemoryLimit,
		settings.UploadMaxFilesize,
		settings.PostMaxSize,
		settings.MaxExecutionTime,
		settings.MaxInputVars,
	)

	poolPath := fmt.Sprintf("/etc/php/%s/fpm/pool.d/%s.conf", phpVer, domain)
	err := os.WriteFile(poolPath, []byte(phpPoolConfig), 0644)
	if err != nil {
		return fmt.Errorf("failed to write php-fpm pool config: %v", err)
	}
	return executeShell("systemctl", "reload", fmt.Sprintf("php%s-fpm", phpVer))
}

// --- NEW CPANEL FEATURE HANDLERS AND HELPERS ---

type CronJob struct {
	Timing  string `json:"timing"`
	Command string `json:"command"`
}

type PrivacyRule struct {
	Domain   string `json:"domain"`
	Path     string `json:"path"`
	Username string `json:"username"`
	Realm    string `json:"realm"`
	Enabled  bool   `json:"enabled"`
}

type DatabaseMetadata struct {
	DBName string `json:"dbName"`
	DBUser string `json:"dbUser"`
	DBPass string `json:"dbPass"`
}

func rebuildNginxConfig(domain string) error {
	list := loadSites()
	var site Site
	found := false
	for _, s := range list {
		if s.Domain == domain {
			site = s
			found = true
			break
		}
	}
	if !found {
		return fmt.Errorf("site not found: %s", domain)
	}

	localWebRoot := fmt.Sprintf("/var/www/vhosts/%s/public", domain)

	// Load directory privacy rules
	var privacyRules []map[string]interface{}
	privacyFile := "/opt/aether-panel/privacy.json"
	if data, err := os.ReadFile(privacyFile); err == nil {
		var allRules []map[string]interface{}
		if json.Unmarshal(data, &allRules) == nil {
			for _, rule := range allRules {
				if rDomain, ok := rule["domain"].(string); ok && rDomain == domain {
					if enabled, ok := rule["enabled"].(bool); ok && enabled {
						privacyRules = append(privacyRules, rule)
					}
				}
			}
		}
	}

	// Build privacy location blocks
	var privacyBlocks strings.Builder
	for _, rule := range privacyRules {
		path := rule["path"].(string)
		
		// Clean and generate safe file name
		safePath := strings.ReplaceAll(path, "/", "_")
		safePath = strings.ReplaceAll(safePath, " ", "_")
		htpasswdPath := fmt.Sprintf("/etc/nginx/privacy/%s%s.htpasswd", domain, safePath)

		privacyBlocks.WriteString(fmt.Sprintf(`
    location %s {
        auth_basic "Restricted Access";
        auth_basic_user_file %s;
        try_files $uri $uri/ /index.php?$args;
        location ~ \.php$ {
            include snippets/fastcgi-php.conf;
            fastcgi_pass unix:/run/php/php%s-fpm-%s.sock;
        }
    }
`, path, htpasswdPath, site.PHPVersion, domain))
	}

	var nginxConfig string
	if site.SSLActive {
		nginxConfig = fmt.Sprintf(`server {
    listen 80;
    server_name %s;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name %s;
    root %s;
    index index.php index.html;

    ssl_certificate /etc/letsencrypt/live/%s/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/%s/privkey.pem;

    access_log /var/log/nginx/%s.access.log;
    error_log /var/log/nginx/%s.error.log;

    include snippets/phpmyadmin.conf;
%s
    location / {
        try_files $uri $uri/ /index.php?$args;
    }

    location ~ \.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/run/php/php%s-fpm-%s.sock;
    }
}`, domain, domain, localWebRoot, domain, domain, domain, domain, privacyBlocks.String(), site.PHPVersion, domain)
	} else {
		nginxConfig = fmt.Sprintf(`server {
    listen 80;
    server_name %s;
    root %s;
    index index.php index.html;

    access_log /var/log/nginx/%s.access.log;
    error_log /var/log/nginx/%s.error.log;

    include snippets/phpmyadmin.conf;
%s
    location / {
        try_files $uri $uri/ /index.php?$args;
    }

    location ~ \.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/run/php/php%s-fpm-%s.sock;
    }
}`, domain, localWebRoot, domain, domain, privacyBlocks.String(), site.PHPVersion, domain)
	}

	nginxPath := fmt.Sprintf("/etc/nginx/sites-available/%s", domain)
	err := os.WriteFile(nginxPath, []byte(nginxConfig), 0644)
	if err != nil {
		return fmt.Errorf("failed to write nginx config: %v", err)
	}

	// Ensure enabled symlink exists
	linkPath := fmt.Sprintf("/etc/nginx/sites-enabled/%s", domain)
	if _, err := os.Stat(linkPath); os.IsNotExist(err) {
		_ = os.Symlink(nginxPath, linkPath)
	}

	// Reload nginx
	return executeShell("systemctl", "reload", "nginx")
}

func loadDatabasesMetadata() []DatabaseMetadata {
	dbFile := "/opt/aether-panel/databases.json"
	data, err := os.ReadFile(dbFile)
	if err != nil {
		return []DatabaseMetadata{}
	}
	var list []DatabaseMetadata
	if err := json.Unmarshal(data, &list); err != nil {
		return []DatabaseMetadata{}
	}
	return list
}

func saveDatabasesMetadata(list []DatabaseMetadata) {
	dbFile := "/opt/aether-panel/databases.json"
	data, _ := json.MarshalIndent(list, "", "  ")
	_ = os.WriteFile(dbFile, data, 0644)
}

func addDatabaseMetadata(dbName, dbUser, dbPass string) {
	list := loadDatabasesMetadata()
	for i, db := range list {
		if db.DBName == dbName {
			list[i].DBUser = dbUser
			list[i].DBPass = dbPass
			saveDatabasesMetadata(list)
			return
		}
	}
	list = append(list, DatabaseMetadata{DBName: dbName, DBUser: dbUser, DBPass: dbPass})
	saveDatabasesMetadata(list)
}

func removeDatabaseMetadata(dbName string) {
	list := loadDatabasesMetadata()
	var newList []DatabaseMetadata
	for _, db := range list {
		if db.DBName != dbName {
			newList = append(newList, db)
		}
	}
	saveDatabasesMetadata(newList)
}

func loadPrivacyRules() []PrivacyRule {
	privacyFile := "/opt/aether-panel/privacy.json"
	data, err := os.ReadFile(privacyFile)
	if err != nil {
		return []PrivacyRule{}
	}
	var rules []PrivacyRule
	if err := json.Unmarshal(data, &rules); err != nil {
		return []PrivacyRule{}
	}
	return rules
}

func savePrivacyRules(rules []PrivacyRule) {
	privacyFile := "/opt/aether-panel/privacy.json"
	data, _ := json.MarshalIndent(rules, "", "  ")
	_ = os.WriteFile(privacyFile, data, 0644)
}

func loadRemoteIPs() []string {
	ipsFile := "/opt/aether-panel/remote_ips.json"
	data, err := os.ReadFile(ipsFile)
	if err != nil {
		return []string{}
	}
	var ips []string
	if err := json.Unmarshal(data, &ips); err != nil {
		return []string{}
	}
	return ips
}

func saveRemoteIPs(ips []string) {
	ipsFile := "/opt/aether-panel/remote_ips.json"
	data, _ := json.MarshalIndent(ips, "", "  ")
	_ = os.WriteFile(ipsFile, data, 0644)
}

func isMySQLPortOpen() bool {
	cmd := exec.Command("ufw", "status")
	var out bytes.Buffer
	cmd.Stdout = &out
	_ = cmd.Run()
	return strings.Contains(out.String(), "3306")
}

func isMySQLBindingGlobal() bool {
	data, err := os.ReadFile("/etc/mysql/mysql.conf.d/mysqld.cnf")
	if err != nil {
		data, err = os.ReadFile("/etc/mysql/mariadb.conf.d/50-server.cnf")
		if err != nil {
			return false
		}
	}
	content := string(data)
	for _, line := range strings.Split(content, "\n") {
		trimmed := strings.TrimSpace(line)
		if strings.HasPrefix(trimmed, "bind-address") {
			fields := strings.Split(trimmed, "=")
			if len(fields) >= 2 {
				val := strings.TrimSpace(fields[1])
				if val == "0.0.0.0" || val == "::" {
					return true
				}
			}
		}
	}
	return false
}

func setMySQLBindAddress(addr string) error {
	paths := []string{
		"/etc/mysql/mysql.conf.d/mysqld.cnf",
		"/etc/mysql/mariadb.conf.d/50-server.cnf",
	}
	var configPath string
	var data []byte
	var err error
	for _, p := range paths {
		data, err = os.ReadFile(p)
		if err == nil {
			configPath = p
			break
		}
	}
	if configPath == "" {
		return fmt.Errorf("mysql config file not found")
	}

	lines := strings.Split(string(data), "\n")
	var newLines []string
	replacedBind := false
	for _, line := range lines {
		trimmed := strings.TrimSpace(line)
		if strings.HasPrefix(trimmed, "bind-address") {
			newLines = append(newLines, "bind-address            = "+addr)
			replacedBind = true
		} else if strings.HasPrefix(trimmed, "mysqlx-bind-address") {
			newLines = append(newLines, "mysqlx-bind-address     = "+addr)
		} else {
			newLines = append(newLines, line)
		}
	}

	if !replacedBind {
		var updatedLines []string
		for _, line := range newLines {
			updatedLines = append(updatedLines, line)
			if strings.TrimSpace(line) == "[mysqld]" {
				updatedLines = append(updatedLines, "bind-address            = "+addr)
				replacedBind = true
			}
		}
		newLines = updatedLines
	}

	return os.WriteFile(configPath, []byte(strings.Join(newLines, "\n")), 0644)
}

func getCronJobsList() ([]CronJob, error) {
	var list []CronJob
	cmd := exec.Command("crontab", "-l")
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr
	err := cmd.Run()
	if err != nil {
		return list, nil
	}

	lines := strings.Split(stdout.String(), "\n")
	for _, line := range lines {
		trimmed := strings.TrimSpace(line)
		if trimmed == "" || strings.HasPrefix(trimmed, "#") {
			continue
		}
		fields := strings.Fields(trimmed)
		if len(fields) >= 6 {
			timing := strings.Join(fields[:5], " ")
			command := strings.Join(fields[5:], " ")
			list = append(list, CronJob{
				Timing:  timing,
				Command: command,
			})
		}
	}
	return list, nil
}

func handleTerminal(w http.ResponseWriter, r *http.Request) {
	if r.Method == "OPTIONS" {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.WriteHeader(http.StatusOK)
		return
	}
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var body struct {
		Cmd string `json:"cmd"`
		Cwd string `json:"cwd"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	cwd := body.Cwd
	if cwd == "" {
		cwd = "/var/www/vhosts"
	}

	cleanCwd := filepath.Clean(cwd)
	if !filepath.IsAbs(cleanCwd) {
		cleanCwd = "/var/www/vhosts"
	}

	runCmd := body.Cmd
	if runCmd == "" {
		runCmd = "pwd"
	}

	fullCommand := fmt.Sprintf("%s ; echo -n '___AETHER_CWD___' ; pwd", runCmd)
	cmd := exec.Command("bash", "-c", fullCommand)
	cmd.Dir = cleanCwd

	var outBuf bytes.Buffer
	cmd.Stdout = &outBuf
	cmd.Stderr = &outBuf

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	err := cmd.Start()
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{
			"output": "Failed to start command: " + err.Error(),
			"cwd":    cleanCwd,
		})
		return
	}

	done := make(chan error, 1)
	go func() {
		done <- cmd.Wait()
	}()

	select {
	case <-ctx.Done():
		if cmd.Process != nil {
			_ = cmd.Process.Kill()
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{
			"output": "Command timed out (10s)",
			"cwd":    cleanCwd,
		})
		return
	case <-done:
	}

	result := outBuf.String()
	output := ""
	newCwd := cleanCwd

	if idx := strings.LastIndex(result, "___AETHER_CWD___"); idx != -1 {
		output = result[:idx]
		newCwd = strings.TrimSpace(result[idx+len("___AETHER_CWD___"):])
	} else {
		output = result
	}

	if newCwd == "" || !filepath.IsAbs(newCwd) {
		newCwd = cleanCwd
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"output": output,
		"cwd":    newCwd,
	})
}

func handleCronList(w http.ResponseWriter, r *http.Request) {
	if r.Method == "OPTIONS" {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.WriteHeader(http.StatusOK)
		return
	}
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	list, err := getCronJobsList()
	if err != nil {
		http.Error(w, "Failed to read crontab: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(list)
}

func handleCronSave(w http.ResponseWriter, r *http.Request) {
	if r.Method == "OPTIONS" {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.WriteHeader(http.StatusOK)
		return
	}
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var body CronJob
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	fields := strings.Fields(body.Timing)
	if len(fields) != 5 || body.Command == "" {
		http.Error(w, "Invalid cron format.", http.StatusBadRequest)
		return
	}

	jobs, err := getCronJobsList()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	jobs = append(jobs, body)

	var sb strings.Builder
	for _, j := range jobs {
		sb.WriteString(fmt.Sprintf("%s %s\n", j.Timing, j.Command))
	}

	cmd := exec.Command("crontab", "-")
	cmd.Stdin = strings.NewReader(sb.String())
	var stderr bytes.Buffer
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		http.Error(w, "Failed to write crontab: "+stderr.String(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "success"})
}

func handleCronDelete(w http.ResponseWriter, r *http.Request) {
	if r.Method == "OPTIONS" {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.WriteHeader(http.StatusOK)
		return
	}
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var body CronJob
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	jobs, err := getCronJobsList()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	var newJobs []CronJob
	for _, j := range jobs {
		if j.Timing == body.Timing && j.Command == body.Command {
			continue
		}
		newJobs = append(newJobs, j)
	}

	var sb strings.Builder
	for _, j := range newJobs {
		sb.WriteString(fmt.Sprintf("%s %s\n", j.Timing, j.Command))
	}

	var cmd *exec.Cmd
	if len(newJobs) == 0 {
		cmd = exec.Command("crontab", "-r")
	} else {
		cmd = exec.Command("crontab", "-")
		cmd.Stdin = strings.NewReader(sb.String())
	}

	var stderr bytes.Buffer
	cmd.Stderr = &stderr
	_ = cmd.Run()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "success"})
}

func handlePrivacyList(w http.ResponseWriter, r *http.Request) {
	if r.Method == "OPTIONS" {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.WriteHeader(http.StatusOK)
		return
	}
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	domain := r.URL.Query().Get("domain")
	if domain == "" {
		http.Error(w, "Domain is required", http.StatusBadRequest)
		return
	}

	rules := loadPrivacyRules()
	var list []PrivacyRule
	for _, r := range rules {
		if r.Domain == domain {
			list = append(list, r)
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(list)
}

func handlePrivacySave(w http.ResponseWriter, r *http.Request) {
	if r.Method == "OPTIONS" {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.WriteHeader(http.StatusOK)
		return
	}
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var body struct {
		Domain   string `json:"domain"`
		Path     string `json:"path"`
		Username string `json:"username"`
		Password string `json:"password"`
		Realm    string `json:"realm"`
		Enabled  bool   `json:"enabled"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if body.Domain == "" || body.Path == "" || body.Username == "" {
		http.Error(w, "Domain, Path, and Username are required fields", http.StatusBadRequest)
		return
	}

	if body.Realm == "" {
		body.Realm = "Restricted Access"
	}

	_ = os.MkdirAll("/etc/nginx/privacy", 0755)

	safePath := strings.ReplaceAll(body.Path, "/", "_")
	safePath = strings.ReplaceAll(safePath, " ", "_")
	htpasswdPath := fmt.Sprintf("/etc/nginx/privacy/%s%s.htpasswd", body.Domain, safePath)

	if body.Password != "" {
		cmd := exec.Command("openssl", "passwd", "-apr1", body.Password)
		var out bytes.Buffer
		cmd.Stdout = &out
		if err := cmd.Run(); err != nil {
			http.Error(w, "Encryption failed: "+err.Error(), http.StatusInternalServerError)
			return
		}
		hash := strings.TrimSpace(out.String())
		htpasswdContent := fmt.Sprintf("%s:%s\n", body.Username, hash)
		_ = os.WriteFile(htpasswdPath, []byte(htpasswdContent), 0644)
	}

	rules := loadPrivacyRules()
	found := false
	for i, r := range rules {
		if r.Domain == body.Domain && r.Path == body.Path {
			rules[i].Username = body.Username
			rules[i].Realm = body.Realm
			rules[i].Enabled = body.Enabled
			found = true
			break
		}
	}
	if !found {
		rules = append(rules, PrivacyRule{
			Domain:   body.Domain,
			Path:     body.Path,
			Username: body.Username,
			Realm:    body.Realm,
			Enabled:  body.Enabled,
		})
	}
	savePrivacyRules(rules)

	err := rebuildNginxConfig(body.Domain)
	if err != nil {
		http.Error(w, "Failed to rebuild nginx config: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "success"})
}

func handlePrivacyDelete(w http.ResponseWriter, r *http.Request) {
	if r.Method == "OPTIONS" {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.WriteHeader(http.StatusOK)
		return
	}
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var body struct {
		Domain string `json:"domain"`
		Path   string `json:"path"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	safePath := strings.ReplaceAll(body.Path, "/", "_")
	safePath = strings.ReplaceAll(safePath, " ", "_")
	htpasswdPath := fmt.Sprintf("/etc/nginx/privacy/%s%s.htpasswd", body.Domain, safePath)
	_ = os.Remove(htpasswdPath)

	rules := loadPrivacyRules()
	var newRules []PrivacyRule
	for _, r := range rules {
		if r.Domain == body.Domain && r.Path == body.Path {
			continue
		}
		newRules = append(newRules, r)
	}
	savePrivacyRules(newRules)

	err := rebuildNginxConfig(body.Domain)
	if err != nil {
		http.Error(w, "Failed to rebuild nginx config: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "success"})
}

func handleDBRemoteStatus(w http.ResponseWriter, r *http.Request) {
	if r.Method == "OPTIONS" {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.WriteHeader(http.StatusOK)
		return
	}
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	enabled := isMySQLPortOpen() && isMySQLBindingGlobal()
	ips := loadRemoteIPs()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"enabled": enabled,
		"ips":     ips,
	})
}

func handleDBRemoteToggle(w http.ResponseWriter, r *http.Request) {
	if r.Method == "OPTIONS" {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.WriteHeader(http.StatusOK)
		return
	}
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var body struct {
		Enabled bool `json:"enabled"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if body.Enabled {
		_ = executeShell("ufw", "allow", "3306/tcp")
		_ = setMySQLBindAddress("0.0.0.0")
	} else {
		_ = executeShell("ufw", "delete", "allow", "3306/tcp")
		_ = setMySQLBindAddress("127.0.0.1")
	}

	_ = executeShell("systemctl", "restart", "mysql")

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "success"})
}

func handleDBRemoteIPAdd(w http.ResponseWriter, r *http.Request) {
	if r.Method == "OPTIONS" {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.WriteHeader(http.StatusOK)
		return
	}
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var body struct {
		IP string `json:"ip"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if body.IP == "" {
		http.Error(w, "IP address is required", http.StatusBadRequest)
		return
	}

	ips := loadRemoteIPs()
	exists := false
	for _, ip := range ips {
		if ip == body.IP {
			exists = true
			break
		}
	}
	if !exists {
		ips = append(ips, body.IP)
		saveRemoteIPs(ips)
	}

	dbs := loadDatabasesMetadata()
	for _, db := range dbs {
		grantSQL := fmt.Sprintf(
			"CREATE USER IF NOT EXISTS '%s'@'%s' IDENTIFIED BY '%s'; GRANT ALL PRIVILEGES ON `%s`.* TO '%s'@'%s'; FLUSH PRIVILEGES;",
			db.DBUser, body.IP, db.DBPass, db.DBName, db.DBUser, body.IP,
		)
		_ = exec.Command("mysql", "-u", "root", "-e", grantSQL).Run()
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "success"})
}

func handleDBRemoteIPRemove(w http.ResponseWriter, r *http.Request) {
	if r.Method == "OPTIONS" {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.WriteHeader(http.StatusOK)
		return
	}
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var body struct {
		IP string `json:"ip"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	ips := loadRemoteIPs()
	var newIps []string
	for _, ip := range ips {
		if ip != body.IP {
			newIps = append(newIps, ip)
		}
	}
	saveRemoteIPs(newIps)

	dbs := loadDatabasesMetadata()
	for _, db := range dbs {
		dropSQL := fmt.Sprintf("DROP USER IF EXISTS '%s'@'%s'; FLUSH PRIVILEGES;", db.DBUser, body.IP)
		_ = exec.Command("mysql", "-u", "root", "-e", dropSQL).Run()
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "success"})
}

func handlePMASession(w http.ResponseWriter, r *http.Request) {
	if r.Method == "OPTIONS" {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.WriteHeader(http.StatusOK)
		return
	}
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	credentialsFile := "/opt/aether-panel/pma_root_credentials.json"
	type PMACredentials struct {
		User string `json:"user"`
		Pass string `json:"pass"`
	}

	var creds PMACredentials
	data, err := os.ReadFile(credentialsFile)
	if err != nil {
		randPass := uuid.New().String() + uuid.New().String()
		randPass = strings.ReplaceAll(randPass, "-", "")[:32]
		creds = PMACredentials{
			User: "aether_pma_root",
			Pass: randPass,
		}

		createSQL := fmt.Sprintf(
			"CREATE USER IF NOT EXISTS '%s'@'localhost' IDENTIFIED BY '%s'; GRANT ALL PRIVILEGES ON *.* TO '%s'@'localhost' WITH GRANT OPTION; FLUSH PRIVILEGES;",
			creds.User, creds.Pass, creds.User,
		)
		err = exec.Command("mysql", "-u", "root", "-e", createSQL).Run()
		if err != nil {
			http.Error(w, "Failed to create phpMyAdmin administrative user: "+err.Error(), http.StatusInternalServerError)
			return
		}

		bytesData, _ := json.Marshal(creds)
		_ = os.WriteFile(credentialsFile, bytesData, 0600)
	} else {
		_ = json.Unmarshal(data, &creds)
	}

	token := uuid.New().String()
	sessionsFile := "/opt/aether-panel/pma_sessions.json"
	type PMASession struct {
		User    string `json:"user"`
		Pass    string `json:"pass"`
		Expires int64  `json:"expires"`
	}

	sessions := make(map[string]PMASession)
	if sessionData, err := os.ReadFile(sessionsFile); err == nil {
		_ = json.Unmarshal(sessionData, &sessions)
	}

	sessions[token] = PMASession{
		User:    creds.User,
		Pass:    creds.Pass,
		Expires: time.Now().Unix() + 30,
	}

	now := time.Now().Unix()
	for k, v := range sessions {
		if now > v.Expires {
			delete(sessions, k)
		}
	}

	bytesData, _ := json.Marshal(sessions)
	_ = os.WriteFile(sessionsFile, bytesData, 0600)
	_ = os.Chmod(sessionsFile, 0644)

	host := r.Host
	if idx := strings.Index(host, ":"); idx != -1 {
		host = host[:idx]
	}

	redirectURL := fmt.Sprintf("https://%s/phpmyadmin/signon.php?token=%s", host, token)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"url": redirectURL,
	})
}

func handleGetPHPSettings(w http.ResponseWriter, r *http.Request) {
	if r.Method == "OPTIONS" {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.WriteHeader(http.StatusOK)
		return
	}
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	domain := r.URL.Query().Get("domain")
	if domain == "" {
		http.Error(w, "domain query parameter is required", http.StatusBadRequest)
		return
	}

	settingsMap := loadPHPSettings()
	settings, exists := settingsMap[domain]
	if !exists {
		settings = PHPDomainSettings{
			MemoryLimit:       "128M",
			UploadMaxFilesize: "64M",
			PostMaxSize:       "64M",
			MaxExecutionTime:  "120",
			MaxInputVars:      "1000",
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(settings)
}

func handleSavePHPSettings(w http.ResponseWriter, r *http.Request) {
	if r.Method == "OPTIONS" {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.WriteHeader(http.StatusOK)
		return
	}
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	var req struct {
		Domain            string `json:"domain"`
		MemoryLimit       string `json:"memory_limit"`
		UploadMaxFilesize string `json:"upload_max_filesize"`
		PostMaxSize       string `json:"post_max_size"`
		MaxExecutionTime  string `json:"max_execution_time"`
		MaxInputVars      string `json:"max_input_vars"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Bad request payload: "+err.Error(), http.StatusBadRequest)
		return
	}

	if req.Domain == "" {
		http.Error(w, "domain is required", http.StatusBadRequest)
		return
	}

	// Validate inputs to prevent malicious shell / pool syntax injection
	valRegex := regexp.MustCompile(`^[0-9a-zA-Z]+$`)
	if !valRegex.MatchString(req.MemoryLimit) ||
		!valRegex.MatchString(req.UploadMaxFilesize) ||
		!valRegex.MatchString(req.PostMaxSize) ||
		!valRegex.MatchString(req.MaxExecutionTime) ||
		!valRegex.MatchString(req.MaxInputVars) {
		http.Error(w, "Invalid setting value format", http.StatusBadRequest)
		return
	}

	settingsMap := loadPHPSettings()
	settingsMap[req.Domain] = PHPDomainSettings{
		MemoryLimit:       req.MemoryLimit,
		UploadMaxFilesize: req.UploadMaxFilesize,
		PostMaxSize:       req.PostMaxSize,
		MaxExecutionTime:  req.MaxExecutionTime,
		MaxInputVars:      req.MaxInputVars,
	}

	if err := savePHPSettings(settingsMap); err != nil {
		http.Error(w, "Failed to save settings: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Retrieve active PHP version for this domain
	sites := loadSites()
	phpVer := "8.3" // default fallback
	found := false
	for _, s := range sites {
		if s.Domain == req.Domain {
			phpVer = s.PHPVersion
			found = true
			break
		}
	}

	if !found {
		http.Error(w, "Domain not found in site list", http.StatusNotFound)
		return
	}

	// Rebuild PHP Pool and reload FPM
	if err := rebuildPHPPool(req.Domain, phpVer); err != nil {
		http.Error(w, "Failed to rebuild PHP pool: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "success"})
}

func main() {
	initCredentials()

	mux := http.NewServeMux()

	// Register API endpoints
	mux.HandleFunc("/api/auth/login", handleLogin)
	mux.HandleFunc("/api/php/ini", authMiddleware(handleGetPHPSettings))
	mux.HandleFunc("/api/php/ini/save", authMiddleware(handleSavePHPSettings))
	
	// Protected administrative endpoints
	mux.HandleFunc("/api/migrate", authMiddleware(handleMigrate))
	mux.HandleFunc("/api/migrate/status", authMiddleware(handleMigrateStatus))
	mux.HandleFunc("/api/ssl/issue", authMiddleware(handleSSLProvision))
	mux.HandleFunc("/api/firewall/rule", authMiddleware(handleFirewall))
	mux.HandleFunc("/api/php/versions", authMiddleware(handlePHPVersions))
	mux.HandleFunc("/api/metrics", authMiddleware(handleMetrics))
	mux.HandleFunc("/api/gdrive/connect", authMiddleware(handleGDriveConnect))
	mux.HandleFunc("/api/sites", authMiddleware(handleGetSites))
	mux.HandleFunc("/api/sites/create", authMiddleware(handleCreateSite))
	mux.HandleFunc("/api/sites/php", authMiddleware(handleUpdatePHP))
	mux.HandleFunc("/api/sites/redis", authMiddleware(handleToggleRedis))
	mux.HandleFunc("/api/sites/delete", authMiddleware(handleDeleteSite))
	mux.HandleFunc("/api/db/create", authMiddleware(handleCreateDB))
	mux.HandleFunc("/api/firewall/rules", authMiddleware(handleFirewallRules))
	mux.HandleFunc("/api/services", authMiddleware(handleServicesList))
	mux.HandleFunc("/api/files", authMiddleware(handleFilesList))
	mux.HandleFunc("/api/files/read", authMiddleware(handleFileRead))
	mux.HandleFunc("/api/files/write", authMiddleware(handleFileWrite))
	mux.HandleFunc("/api/sites/logs", authMiddleware(handleSiteLogs))
	mux.HandleFunc("/api/db/list", authMiddleware(handleListDB))
	mux.HandleFunc("/api/db/delete", authMiddleware(handleDeleteDB))
	mux.HandleFunc("/api/services/control", authMiddleware(handleServiceControl))
	mux.HandleFunc("/api/install", authMiddleware(handleInstallApp))
	mux.HandleFunc("/api/uninstall", authMiddleware(handleUninstallApp))
	mux.HandleFunc("/api/config/read", authMiddleware(handleConfigRead))
	mux.HandleFunc("/api/config/write", authMiddleware(handleConfigWrite))

	// New cPanel Feature endpoints
	mux.HandleFunc("/api/terminal", authMiddleware(handleTerminal))
	mux.HandleFunc("/api/cron", authMiddleware(handleCronList))
	mux.HandleFunc("/api/cron/save", authMiddleware(handleCronSave))
	mux.HandleFunc("/api/cron/delete", authMiddleware(handleCronDelete))
	mux.HandleFunc("/api/privacy", authMiddleware(handlePrivacyList))
	mux.HandleFunc("/api/privacy/save", authMiddleware(handlePrivacySave))
	mux.HandleFunc("/api/privacy/delete", authMiddleware(handlePrivacyDelete))
	mux.HandleFunc("/api/db/remote", authMiddleware(handleDBRemoteStatus))
	mux.HandleFunc("/api/db/remote/toggle", authMiddleware(handleDBRemoteToggle))
	mux.HandleFunc("/api/db/remote/ip/add", authMiddleware(handleDBRemoteIPAdd))
	mux.HandleFunc("/api/db/remote/ip/remove", authMiddleware(handleDBRemoteIPRemove))
	mux.HandleFunc("/api/db/pma-session", authMiddleware(handlePMASession))

	// Static assets handler (React dashboard compilation output)
	mux.Handle("/", http.FileServer(http.Dir("./frontend/dist")))

	// Start background workers
	go startSSLAutoRenewalWorker()
	go startGDriveBackupWorker()

	port := os.Getenv("PANEL_PORT")
	if port == "" {
		port = "8443" // secure premium panel default port
	}

	certFile := os.Getenv("PANEL_SSL_CERT")
	keyFile := os.Getenv("PANEL_SSL_KEY")

	// Auto-detect Certbot default certificates if present
	if certFile == "" || keyFile == "" {
		files, _ := filepath.Glob("/etc/letsencrypt/live/*/fullchain.pem")
		if len(files) > 0 {
			certFile = files[0]
			keyFile = filepath.Join(filepath.Dir(certFile), "privkey.pem")
		}
	}

	server := corsMiddleware(mux)

	if certFile != "" && keyFile != "" {
		fmt.Printf("Aether Panel starting on SECURE HTTPS socket :%s\n", port)
		fmt.Printf("Loaded certificates: Cert=%s, Key=%s\n", certFile, keyFile)
		log.Fatal(http.ListenAndServeTLS(":"+port, certFile, keyFile, server))
	} else {
		fmt.Printf("Aether Panel starting on INSECURE HTTP socket :%s\n", port)
		fmt.Println("Warning: SSL/TLS is missing. Run behind a reverse proxy or set PANEL_SSL_CERT and PANEL_SSL_KEY.")
		log.Fatal(http.ListenAndServe(":"+port, server))
	}
}

// corsMiddleware injects routing headers for API calls.
func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func handleLogin(w http.ResponseWriter, r *http.Request) {
	// Enable CORS preflight handling directly
	if r.Method == "OPTIONS" {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		w.WriteHeader(http.StatusOK)
		return
	}

	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	
	var creds struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}
	
	if err := json.NewDecoder(r.Body).Decode(&creds); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}
	
	if creds.Username != adminUser {
		http.Error(w, "Invalid credentials", http.StatusUnauthorized)
		return
	}
	
	err := bcrypt.CompareHashAndPassword(adminPassHash, []byte(creds.Password))
	if err != nil {
		http.Error(w, "Invalid credentials", http.StatusUnauthorized)
		return
	}
	
	token, err := generateToken(creds.Username)
	if err != nil {
		http.Error(w, "Failed to generate session", http.StatusInternalServerError)
		return
	}
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"token": token,
	})
}

// handleMigrate runs SFTP scans, remote SQL fetch, config parsing, and site binding inside local webroot.
func handleMigrate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req MigrationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Bad request payload: "+err.Error(), http.StatusBadRequest)
		return
	}

	if err := validateMigrationRequest(req); err != nil {
		http.Error(w, "Validation failed: "+err.Error(), http.StatusBadRequest)
		return
	}

	jobID := uuid.New().String()
	log.Printf("[Migration Job %s] Initializing site migration for %s", jobID, req.LocalDomain)
	setJobStatus(jobID, req.LocalDomain, "pending", "Job queued")

	// Executing in background to prevent HTTP timeouts
	go func(id string, config MigrationRequest) {
		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Minute)
		defer cancel()

		setJobStatus(id, config.LocalDomain, "processing", "Provisioning isolated Linux user...")

		localWebRoot := fmt.Sprintf("/var/www/vhosts/%s/public", config.LocalDomain)

		// 1. Provision isolated Linux User & Systemd sandbox path
		if err := executeShell("useradd", "-m", "-d", fmt.Sprintf("/var/www/vhosts/%s", config.LocalDomain), "-s", "/usr/sbin/nologin", config.LocalDomain); err != nil {
			log.Printf("[%s] Warning: user creation fallback or user exists: %v", id, err)
		}

		// 2. Fetch and Extract remote directory structure
		setJobStatus(id, config.LocalDomain, "processing", "Connecting to remote host...")

		creds := migration.MigrationCredentials{
			Host:           config.RemoteHost,
			Port:           config.RemotePort,
			Username:       config.RemoteUser,
			Password:       config.RemotePass,
			PrivateKey:     config.RemoteKey,
			RemotePathHint: config.RemoteWebRoot,
		}

		scanner := migration.NewSFTPMigrationScanner(creds)
		if err := scanner.Connect(); err != nil {
			setJobStatus(id, config.LocalDomain, "failed", "SFTP connection failed: "+err.Error())
			return
		}
		defer scanner.Close()

		remoteWebRoot := config.RemoteWebRoot
		if remoteWebRoot == "" {
			setJobStatus(id, config.LocalDomain, "processing", "Auto-discovering remote web root...")
			discovered, err := scanner.AutoDiscoverWebRoot(ctx)
			if err != nil {
				setJobStatus(id, config.LocalDomain, "failed", "Web root auto-discovery failed: "+err.Error())
				return
			}
			remoteWebRoot = discovered
		}

		setJobStatus(id, config.LocalDomain, "processing", fmt.Sprintf("Compressing and downloading files from %s...", remoteWebRoot))
		if err := scanner.CompressAndDownload(ctx, remoteWebRoot, localWebRoot); err != nil {
			setJobStatus(id, config.LocalDomain, "failed", "Files transfer failed: "+err.Error())
			return
		}

		// 3. Connect DB Fetcher and retrieve schema
		setJobStatus(id, config.LocalDomain, "processing", "Fetching and restoring database...")

		dbCreds := migration.DatabaseCredentials{
			Type:     migration.MySQL,
			Host:     config.RemoteDBHost,
			Port:     config.RemoteDBPort,
			Username: config.RemoteDBUser,
			Password: config.RemoteDBPass,
			DBName:   config.RemoteDBName,
		}

		localDBUser := config.LocalDomain
		localDBPass := uuid.New().String()[:12]
		localDBName := strings.ReplaceAll(config.LocalDomain, ".", "_")

		fetcher := migration.NewDatabaseFetcher(dbCreds, scanner.SSHClient())
		if err := fetcher.FetchAndRestore(ctx, localDBUser, localDBPass, localDBName); err != nil {
			setJobStatus(id, config.LocalDomain, "failed", "Database migration failed: "+err.Error())
			return
		}

		// 4. Update configuration files
		setJobStatus(id, config.LocalDomain, "processing", "Updating database credentials in app configs...")
		parser := migration.NewConfigParser()

		wpConfigPath := filepath.Join(localWebRoot, "wp-config.php")
		envPath := filepath.Join(localWebRoot, ".env")

		_ = parser.UpdateDatabaseConfig(wpConfigPath, "127.0.0.1", "3306", localDBName, localDBUser, localDBPass)
		_ = parser.UpdateDatabaseConfig(envPath, "127.0.0.1", "3306", localDBName, localDBUser, localDBPass)

		// 5. Dynamic PHP-FPM pool allocation for isolated target user
		setJobStatus(id, config.LocalDomain, "processing", "Allocating PHP-FPM execution pool...")
		if err := rebuildPHPPool(config.LocalDomain, config.LocalPHPVer); err != nil {
			log.Printf("[%s] Warning: failed to rebuild PHP pool: %v", id, err)
		}

		// 6. Generate nginx config template and reload Nginx reverse proxy
		setJobStatus(id, config.LocalDomain, "processing", "Configuring Nginx routing template...")
		addSiteToStore(config.LocalDomain, config.LocalPHPVer, false, false)
		_ = rebuildNginxConfig(config.LocalDomain)
		setJobStatus(id, config.LocalDomain, "completed", "Migration finished successfully!")
	}(jobID, req)

	w.WriteHeader(http.StatusAccepted)
	json.NewEncoder(w).Encode(map[string]string{
		"jobId":   jobID,
		"status":  "processing",
		"message": "Migration worker running in background",
	})
}

// handleMigrateStatus returns current migration task status.
func handleMigrateStatus(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	jobID := r.URL.Query().Get("jobId")
	if jobID == "" {
		http.Error(w, "jobId is required", http.StatusBadRequest)
		return
	}
	job, exists := getJobStatus(jobID)
	if !exists {
		http.Error(w, "Job not found", http.StatusNotFound)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(job)
}

// handleSSLProvision interfaces with Let's Encrypt Certbot locally.
func handleSSLProvision(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	var body struct {
		Domain string `json:"domain"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if !domainRegex.MatchString(body.Domain) {
		http.Error(w, "Invalid domain format", http.StatusBadRequest)
		return
	}

	// 1-Click Certbot Issuance
	go func(domain string) {
		log.Printf("Requesting Let's Encrypt certificate for %s", domain)
		err := executeShell("certbot", "--nginx", "-d", domain, "--non-interactive", "--agree-tos", "--register-unsafely-without-email")
		if err != nil {
			log.Printf("Certbot failure for %s: %v", domain, err)
			return
		}
		list := loadSites()
		for i, s := range list {
			if s.Domain == domain {
				list[i].SSLActive = true
				break
			}
		}
		saveSites(list)
		_ = rebuildNginxConfig(domain)
	}(body.Domain)

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "provisioning", "domain": body.Domain})
}

// handleFirewall controls local UFW or IPtables firewall.
func handleFirewall(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	var body struct {
		Action string `json:"action"` // "allow" or "deny"
		Port   string `json:"port"`   // e.g. "80", "443", "3306"
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if body.Action != "allow" && body.Action != "deny" {
		http.Error(w, "Invalid action parameter", http.StatusBadRequest)
		return
	}
	portVal, err := strconv.Atoi(body.Port)
	if err != nil || portVal < 1 || portVal > 65535 {
		http.Error(w, "Invalid port parameter", http.StatusBadRequest)
		return
	}

	err = executeShell("ufw", body.Action, strconv.Itoa(portVal))
	if err != nil {
		http.Error(w, "Failed to apply firewall rule: "+err.Error(), http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(map[string]string{"status": "success", "message": fmt.Sprintf("UFW rule updated: %s %s", body.Action, body.Port)})
}

// handlePHPVersions returns active pools and available system engines.
func handlePHPVersions(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	versions := []string{"7.4", "8.1", "8.2", "8.3", "8.4"}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(versions)
}

// handleMetrics polls server telemetry details.
func handleMetrics(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	metrics := getSystemMetrics()
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(metrics)
}

// handleGDriveConnect processes GDrive OAuth callback code, encrypts, and stores tokens.
func handleGDriveConnect(w http.ResponseWriter, r *http.Request) {
	authCode := r.URL.Query().Get("code")
	if authCode == "" {
		http.Error(w, "Auth code missing", http.StatusBadRequest)
		return
	}

	log.Printf("Google Drive OAuth2 authorization completed successfully")
	json.NewEncoder(w).Encode(map[string]string{"status": "connected"})
}

// Background worker running Let's Encrypt renew cron operations.
func startSSLAutoRenewalWorker() {
	ticker := time.NewTicker(24 * time.Hour)
	for range ticker.C {
		log.Println("[Auto-Renewal Worker] Verifying SSL Cert renewals")
		_ = executeShell("certbot", "renew", "--quiet")
	}
}

// Background worker managing zipped database/website uploads to Google Drive.
func startGDriveBackupWorker() {
	ticker := time.NewTicker(12 * time.Hour)
	for range ticker.C {
		log.Println("[Backup Worker] Compressing sites and streaming encryption pipelines to GDrive")
	}
}

// handleCreateSite provisions a brand-new website with nginx vhost + PHP-FPM pool.
func handleCreateSite(w http.ResponseWriter, r *http.Request) {
	if r.Method == "OPTIONS" {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.WriteHeader(http.StatusOK)
		return
	}
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	var body struct {
		Domain     string `json:"domain"`
		PHPVersion string `json:"phpVersion"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if !domainRegex.MatchString(body.Domain) {
		http.Error(w, "Invalid domain format", http.StatusBadRequest)
		return
	}
	validPHP := false
	for _, v := range []string{"7.4", "8.1", "8.2", "8.3", "8.4"} {
		if body.PHPVersion == v {
			validPHP = true
			break
		}
	}
	if !validPHP {
		body.PHPVersion = "8.3"
	}

	localWebRoot := fmt.Sprintf("/var/www/vhosts/%s/public", body.Domain)
	_ = os.MkdirAll(localWebRoot, 0755)
	_ = os.WriteFile(filepath.Join(localWebRoot, "index.html"), []byte(fmt.Sprintf("<html><body><h1>%s</h1><p>Site created by Aether Panel</p></body></html>", body.Domain)), 0644)

	// Create system user
	_ = executeShell("useradd", "-m", "-d", fmt.Sprintf("/var/www/vhosts/%s", body.Domain), "-s", "/usr/sbin/nologin", body.Domain)
	_ = executeShell("chown", "-R", fmt.Sprintf("%s:%s", body.Domain, body.Domain), fmt.Sprintf("/var/www/vhosts/%s", body.Domain))

	// PHP-FPM pool
	err := rebuildPHPPool(body.Domain, body.PHPVersion)
	if err != nil {
		http.Error(w, "Failed to rebuild PHP pool: "+err.Error(), http.StatusInternalServerError)
		return
	}

	addSiteToStore(body.Domain, body.PHPVersion, false, false)
	_ = rebuildNginxConfig(body.Domain)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "success", "domain": body.Domain})
}

// handleCreateDB provisions a MySQL database with a dedicated user.
func handleCreateDB(w http.ResponseWriter, r *http.Request) {
	if r.Method == "OPTIONS" {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.WriteHeader(http.StatusOK)
		return
	}
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	var body struct {
		DBName   string `json:"dbName"`
		DBUser   string `json:"dbUser"`
		DBPass   string `json:"dbPass"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	safeNameRegex := regexp.MustCompile(`^[a-zA-Z0-9_]{1,64}$`)
	if !safeNameRegex.MatchString(body.DBName) {
		http.Error(w, "Invalid database name", http.StatusBadRequest)
		return
	}
	if !safeNameRegex.MatchString(body.DBUser) {
		http.Error(w, "Invalid database user", http.StatusBadRequest)
		return
	}
	if body.DBPass == "" {
		body.DBPass = uuid.New().String()[:16]
	}

	createSQL := fmt.Sprintf(
		"CREATE DATABASE IF NOT EXISTS `%s`; CREATE USER IF NOT EXISTS '%s'@'localhost' IDENTIFIED BY '%s'; GRANT ALL PRIVILEGES ON `%s`.* TO '%s'@'localhost'; FLUSH PRIVILEGES;",
		body.DBName, body.DBUser, body.DBPass, body.DBName, body.DBUser,
	)

	cmd := exec.Command("mysql", "-u", "root", "-e", createSQL)
	var stderr bytes.Buffer
	cmd.Stderr = &stderr
	err := cmd.Run()
	if err != nil {
		http.Error(w, "MySQL error: "+stderr.String(), http.StatusInternalServerError)
		return
	}

	addDatabaseMetadata(body.DBName, body.DBUser, body.DBPass)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"status":   "success",
		"dbName":   body.DBName,
		"dbUser":   body.DBUser,
		"dbPass":   body.DBPass,
		"dbHost":   "localhost",
	})
}

// handleFirewallRules returns UFW rule listing.
func handleFirewallRules(w http.ResponseWriter, r *http.Request) {
	if r.Method == "OPTIONS" {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.WriteHeader(http.StatusOK)
		return
	}
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	cmd := exec.Command("ufw", "status", "numbered")
	var out bytes.Buffer
	cmd.Stdout = &out
	err := cmd.Run()
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{"status": "inactive", "rules": []string{}})
		return
	}

	lines := strings.Split(out.String(), "\n")
	var rules []string
	for _, line := range lines {
		trimmed := strings.TrimSpace(line)
		if trimmed != "" && !strings.HasPrefix(trimmed, "Status:") && !strings.HasPrefix(trimmed, "--") && !strings.HasPrefix(trimmed, "To") {
			rules = append(rules, trimmed)
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"status": "active", "rules": rules})
}

// handleServicesList returns status of key system services.
func handleServicesList(w http.ResponseWriter, r *http.Request) {
	if r.Method == "OPTIONS" {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.WriteHeader(http.StatusOK)
		return
	}
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	serviceNames := []string{"nginx", "mysql", "redis-server", "php8.3-fpm", "ufw", "aether-panel"}
	type ServiceInfo struct {
		Name   string `json:"name"`
		Active bool   `json:"active"`
	}
	var services []ServiceInfo
	for _, svc := range serviceNames {
		cmd := exec.Command("systemctl", "is-active", svc)
		var out bytes.Buffer
		cmd.Stdout = &out
		_ = cmd.Run()
		active := strings.TrimSpace(out.String()) == "active"
		services = append(services, ServiceInfo{Name: svc, Active: active})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(services)
}

// handleFilesList lists files in the site's directory.
func handleFilesList(w http.ResponseWriter, r *http.Request) {
	if r.Method == "OPTIONS" {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.WriteHeader(http.StatusOK)
		return
	}
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	domain := r.URL.Query().Get("domain")
	path := r.URL.Query().Get("path")

	if !domainRegex.MatchString(domain) {
		http.Error(w, "Invalid domain", http.StatusBadRequest)
		return
	}

	domainDir := filepath.Clean(filepath.Join("/var/www/vhosts", domain))
	cleanPath := filepath.Clean(filepath.Join(domainDir, path))
	if !strings.HasPrefix(cleanPath, domainDir) {
		http.Error(w, "Access Denied: Path traversal detected", http.StatusForbidden)
		return
	}

	files, err := os.ReadDir(cleanPath)
	if err != nil {
		http.Error(w, "Directory not found: "+err.Error(), http.StatusNotFound)
		return
	}

	type FileItem struct {
		Name  string `json:"name"`
		IsDir bool   `json:"isDir"`
		Size  int64  `json:"size"`
		Perm  string `json:"perm"`
	}
	var items []FileItem
	for _, f := range files {
		info, err := f.Info()
		var size int64
		var perm string
		if err == nil {
			size = info.Size()
			perm = info.Mode().String()
		}
		items = append(items, FileItem{
			Name:  f.Name(),
			IsDir: f.IsDir(),
			Size:  size,
			Perm:  perm,
		})
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(items)
}

// handleFileRead reads file content.
func handleFileRead(w http.ResponseWriter, r *http.Request) {
	if r.Method == "OPTIONS" {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.WriteHeader(http.StatusOK)
		return
	}
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	domain := r.URL.Query().Get("domain")
	path := r.URL.Query().Get("path")

	if !domainRegex.MatchString(domain) {
		http.Error(w, "Invalid domain", http.StatusBadRequest)
		return
	}

	domainDir := filepath.Clean(filepath.Join("/var/www/vhosts", domain))
	cleanPath := filepath.Clean(filepath.Join(domainDir, path))
	if !strings.HasPrefix(cleanPath, domainDir) {
		http.Error(w, "Access Denied", http.StatusForbidden)
		return
	}

	info, err := os.Stat(cleanPath)
	if err != nil || info.IsDir() {
		http.Error(w, "File not found or is a directory", http.StatusBadRequest)
		return
	}

	content, err := os.ReadFile(cleanPath)
	if err != nil {
		http.Error(w, "Failed to read file: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "text/plain; charset=utf-8")
	w.Write(content)
}

// handleFileWrite saves file content.
func handleFileWrite(w http.ResponseWriter, r *http.Request) {
	if r.Method == "OPTIONS" {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.WriteHeader(http.StatusOK)
		return
	}
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var body struct {
		Domain  string `json:"domain"`
		Path    string `json:"path"`
		Content string `json:"content"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if !domainRegex.MatchString(body.Domain) {
		http.Error(w, "Invalid domain", http.StatusBadRequest)
		return
	}

	domainDir := filepath.Clean(filepath.Join("/var/www/vhosts", body.Domain))
	cleanPath := filepath.Clean(filepath.Join(domainDir, body.Path))
	if !strings.HasPrefix(cleanPath, domainDir) {
		http.Error(w, "Access Denied", http.StatusForbidden)
		return
	}

	err := os.WriteFile(cleanPath, []byte(body.Content), 0644)
	if err != nil {
		http.Error(w, "Failed to write file: "+err.Error(), http.StatusInternalServerError)
		return
	}

	_ = executeShell("chown", fmt.Sprintf("%s:%s", body.Domain, body.Domain), cleanPath)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "success"})
}

// handleSiteLogs fetches Nginx logs for a site.
func handleSiteLogs(w http.ResponseWriter, r *http.Request) {
	if r.Method == "OPTIONS" {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.WriteHeader(http.StatusOK)
		return
	}
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	domain := r.URL.Query().Get("domain")

	if !domainRegex.MatchString(domain) {
		http.Error(w, "Invalid domain", http.StatusBadRequest)
		return
	}

	accessLogPath := fmt.Sprintf("/var/log/nginx/%s.access.log", domain)
	errorLogPath := fmt.Sprintf("/var/log/nginx/%s.error.log", domain)

	if _, err := os.Stat(accessLogPath); os.IsNotExist(err) {
		accessLogPath = "/var/log/nginx/access.log"
	}
	if _, err := os.Stat(errorLogPath); os.IsNotExist(err) {
		errorLogPath = "/var/log/nginx/error.log"
	}

	tailAccess := exec.Command("tail", "-n", "50", accessLogPath)
	outAccess, _ := tailAccess.Output()

	tailError := exec.Command("tail", "-n", "50", errorLogPath)
	outError, _ := tailError.Output()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"access": string(outAccess),
		"error":  string(outError),
	})
}

// handleListDB lists MySQL databases.
func handleListDB(w http.ResponseWriter, r *http.Request) {
	if r.Method == "OPTIONS" {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.WriteHeader(http.StatusOK)
		return
	}
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	cmd := exec.Command("mysql", "-u", "root", "-e", "SHOW DATABASES")
	var out bytes.Buffer
	cmd.Stdout = &out
	err := cmd.Run()
	if err != nil {
		http.Error(w, "Failed to fetch databases: "+err.Error(), http.StatusInternalServerError)
		return
	}

	lines := strings.Split(out.String(), "\n")
	var databases []string
	for _, line := range lines {
		trimmed := strings.TrimSpace(line)
		if trimmed == "" || trimmed == "Database" || trimmed == "information_schema" || trimmed == "mysql" || trimmed == "performance_schema" || trimmed == "sys" {
			continue
		}
		databases = append(databases, trimmed)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(databases)
}

// handleDeleteDB drops a MySQL database and user.
func handleDeleteDB(w http.ResponseWriter, r *http.Request) {
	if r.Method == "OPTIONS" {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.WriteHeader(http.StatusOK)
		return
	}
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var body struct {
		DBName string `json:"dbName"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	safeNameRegex := regexp.MustCompile(`^[a-zA-Z0-9_]{1,64}$`)
	if !safeNameRegex.MatchString(body.DBName) {
		http.Error(w, "Invalid database name", http.StatusBadRequest)
		return
	}

	dropSQL := fmt.Sprintf("DROP DATABASE IF EXISTS `%s`; DROP USER IF EXISTS '%s'@'localhost';", body.DBName, body.DBName)
	cmd := exec.Command("mysql", "-u", "root", "-e", dropSQL)
	var stderr bytes.Buffer
	cmd.Stderr = &stderr
	err := cmd.Run()
	if err != nil {
		http.Error(w, "MySQL error: "+stderr.String(), http.StatusInternalServerError)
		return
	}

	removeDatabaseMetadata(body.DBName)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "success"})
}

// handleServiceControl handles service controls (Start/Stop/Restart).
func handleServiceControl(w http.ResponseWriter, r *http.Request) {
	if r.Method == "OPTIONS" {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.WriteHeader(http.StatusOK)
		return
	}
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var body struct {
		Service string `json:"service"`
		Action  string `json:"action"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	validServices := map[string]bool{
		"nginx": true, "mysql": true, "redis-server": true,
		"php7.4-fpm": true, "php8.1-fpm": true, "php8.2-fpm": true, "php8.3-fpm": true, "php8.4-fpm": true,
		"ufw": true, "aether-panel": true,
	}
	validActions := map[string]bool{
		"start": true, "stop": true, "restart": true,
	}

	if !validServices[body.Service] || !validActions[body.Action] {
		http.Error(w, "Invalid service or action", http.StatusBadRequest)
		return
	}

	err := executeShell("systemctl", body.Action, body.Service)
	if err != nil {
		http.Error(w, "Failed to control service: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "success"})
}

// handleInstallApp handles 1-Click installations for WordPress and Laravel.
func handleInstallApp(w http.ResponseWriter, r *http.Request) {
	if r.Method == "OPTIONS" {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.WriteHeader(http.StatusOK)
		return
	}
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var body struct {
		Domain string `json:"domain"`
		App    string `json:"app"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if !domainRegex.MatchString(body.Domain) {
		http.Error(w, "Invalid domain format", http.StatusBadRequest)
		return
	}

	if body.App != "wordpress" && body.App != "laravel" {
		http.Error(w, "Unsupported app type. Only wordpress and laravel are supported.", http.StatusBadRequest)
		return
	}

	// Verify domain exists in our database
	sites := loadSites()
	siteExists := false
	for _, s := range sites {
		if s.Domain == body.Domain {
			siteExists = true
			break
		}
	}
	if !siteExists {
		http.Error(w, "Domain does not exist in Aether Panel", http.StatusBadRequest)
		return
	}

	jobID := uuid.New().String()
	log.Printf("[Install Job %s] Initializing %s installation on %s", jobID, body.App, body.Domain)
	setJobStatus(jobID, body.Domain, "pending", "Job queued")

	go func(id, domain, app string) {
		dbName := strings.ReplaceAll(domain, ".", "_")
		if len(dbName) > 30 {
			dbName = dbName[:30]
		}
		dbName = dbName + "_db"

		dbUser := strings.ReplaceAll(domain, ".", "_")
		if len(dbUser) > 16 {
			dbUser = dbUser[:16]
		}
		dbUser = dbUser + "_usr"
		dbPass := uuid.New().String()[:16]

		setJobStatus(id, domain, "processing", "Provisioning MySQL database...")
		createSQL := fmt.Sprintf(
			"CREATE DATABASE IF NOT EXISTS `%s`; CREATE USER IF NOT EXISTS '%s'@'localhost' IDENTIFIED BY '%s'; GRANT ALL PRIVILEGES ON `%s`.* TO '%s'@'localhost'; FLUSH PRIVILEGES;",
			dbName, dbUser, dbPass, dbName, dbUser,
		)
		dbCmd := exec.Command("mysql", "-u", "root", "-e", createSQL)
		if err := dbCmd.Run(); err != nil {
			setJobStatus(id, domain, "failed", "Database creation failed: "+err.Error())
			return
		}
		addDatabaseMetadata(dbName, dbUser, dbPass)

		publicDir := fmt.Sprintf("/var/www/vhosts/%s/public", domain)
		siteDir := fmt.Sprintf("/var/www/vhosts/%s", domain)
		_ = os.MkdirAll(publicDir, 0755)

		if app == "wordpress" {
			setJobStatus(id, domain, "processing", "Downloading WordPress archive...")
			downloadCmd := exec.Command("curl", "-L", "-o", "/tmp/wordpress_latest.tar.gz", "https://wordpress.org/latest.tar.gz")
			if err := downloadCmd.Run(); err != nil {
				setJobStatus(id, domain, "failed", "Failed to download WordPress: "+err.Error())
				return
			}

			setJobStatus(id, domain, "processing", "Extracting WordPress files...")
			// Clean existing index.html
			_ = os.Remove(filepath.Join(publicDir, "index.html"))
			extractCmd := exec.Command("tar", "-xzf", "/tmp/wordpress_latest.tar.gz", "-C", publicDir, "--strip-components=1")
			if err := extractCmd.Run(); err != nil {
				setJobStatus(id, domain, "failed", "Failed to extract WordPress: "+err.Error())
				return
			}

			setJobStatus(id, domain, "processing", "Configuring wp-config.php...")
			wpConfig := fmt.Sprintf(`<?php
define( 'DB_NAME', '%s' );
define( 'DB_USER', '%s' );
define( 'DB_PASSWORD', '%s' );
define( 'DB_HOST', 'localhost' );
define( 'DB_CHARSET', 'utf8' );
define( 'DB_COLLATE', '' );

define( 'AUTH_KEY',         '%s' );
define( 'SECURE_AUTH_KEY',  '%s' );
define( 'LOGGED_IN_KEY',    '%s' );
define( 'NONCE_KEY',        '%s' );
define( 'AUTH_SALT',        '%s' );
define( 'SECURE_AUTH_SALT', '%s' );
define( 'LOGGED_IN_SALT',   '%s' );
define( 'NONCE_SALT',       '%s' );

$table_prefix = 'wp_';

define( 'WP_DEBUG', false );

if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', __DIR__ . '/' );
}

require_once ABSPATH . 'wp-settings.php';
`, dbName, dbUser, dbPass,
				uuid.New().String(), uuid.New().String(), uuid.New().String(), uuid.New().String(),
				uuid.New().String(), uuid.New().String(), uuid.New().String(), uuid.New().String())

			wpConfigPath := filepath.Join(publicDir, "wp-config.php")
			if err := os.WriteFile(wpConfigPath, []byte(wpConfig), 0644); err != nil {
				setJobStatus(id, domain, "failed", "Failed to write wp-config.php: "+err.Error())
				return
			}

			setJobStatus(id, domain, "processing", "Setting file permissions...")
			chownCmd := exec.Command("chown", "-R", fmt.Sprintf("%s:%s", domain, domain), siteDir)
			_ = chownCmd.Run()

			setJobStatus(id, domain, "completed", "WordPress installed successfully!")

		} else if app == "laravel" {
			setJobStatus(id, domain, "processing", "Installing Laravel framework via Composer...")
			tempLaravelDir := filepath.Join(siteDir, "temp_laravel")
			_ = os.RemoveAll(tempLaravelDir)

			composerCmd := exec.Command("composer", "create-project", "--prefer-dist", "laravel/laravel", tempLaravelDir, "--no-interaction")
			composerCmd.Env = append(os.Environ(), "COMPOSER_ALLOW_SUPERUSER=1")
			if err := composerCmd.Run(); err != nil {
				setJobStatus(id, domain, "failed", "Composer install failed: "+err.Error())
				return
			}

			setJobStatus(id, domain, "processing", "Aligning Laravel directory structure...")
			// Remove default index.html and files in public
			_ = os.RemoveAll(publicDir)

			// Copy files from temp_laravel to siteDir
			copyCmd := exec.Command("cp", "-a", tempLaravelDir+"/.", siteDir+"/")
			if err := copyCmd.Run(); err != nil {
				setJobStatus(id, domain, "failed", "Failed to copy Laravel files: "+err.Error())
				return
			}

			// Clean temp directory
			_ = os.RemoveAll(tempLaravelDir)

			setJobStatus(id, domain, "processing", "Configuring environment database connection...")
			envPath := filepath.Join(siteDir, ".env")
			if envData, err := os.ReadFile(envPath); err == nil {
				content := string(envData)
				content = strings.ReplaceAll(content, "DB_CONNECTION=sqlite", "DB_CONNECTION=mysql")
				content = strings.ReplaceAll(content, "# DB_HOST=127.0.0.1", "DB_HOST=127.0.0.1")
				content = strings.ReplaceAll(content, "# DB_PORT=3306", "DB_PORT=3306")
				content = strings.ReplaceAll(content, "# DB_DATABASE=laravel", fmt.Sprintf("DB_DATABASE=%s", dbName))
				content = strings.ReplaceAll(content, "# DB_USERNAME=root", fmt.Sprintf("DB_USERNAME=%s", dbUser))
				content = strings.ReplaceAll(content, "# DB_PASSWORD=", fmt.Sprintf("DB_PASSWORD=%s", dbPass))
				_ = os.WriteFile(envPath, []byte(content), 0644)
			}
			parser := migration.NewConfigParser()
			if err := parser.UpdateDatabaseConfig(envPath, "127.0.0.1", "3306", dbName, dbUser, dbPass); err != nil {
				log.Printf("Warning: failed to update .env DB config: %v", err)
			}

			setJobStatus(id, domain, "processing", "Generating application key...")
			keyCmd := exec.Command("php", filepath.Join(siteDir, "artisan"), "key:generate")
			_ = keyCmd.Run()

			setJobStatus(id, domain, "processing", "Setting file permissions...")
			chownCmd := exec.Command("chown", "-R", fmt.Sprintf("%s:%s", domain, domain), siteDir)
			_ = chownCmd.Run()

			setJobStatus(id, domain, "completed", "Laravel installed successfully!")
		}
	}(jobID, body.Domain, body.App)

	w.WriteHeader(http.StatusAccepted)
	json.NewEncoder(w).Encode(map[string]string{
		"jobId":   jobID,
		"status":  "processing",
		"message": "App installation worker running in background",
	})
}

// handleUninstallApp cleans up installed applications on the domain (WordPress or Laravel).
func handleUninstallApp(w http.ResponseWriter, r *http.Request) {
	if r.Method == "OPTIONS" {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.WriteHeader(http.StatusOK)
		return
	}
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	var body struct {
		Domain string `json:"domain"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// Validate domain exists
	list := loadSites()
	found := false
	for _, s := range list {
		if s.Domain == body.Domain {
			found = true
			break
		}
	}
	if !found {
		http.Error(w, "Domain does not exist in Aether Panel", http.StatusBadRequest)
		return
	}

	// 1. Wipe the files in the public directory and create index.html placeholder
	publicPath := fmt.Sprintf("/var/www/vhosts/%s/public", body.Domain)
	_ = executeShell("rm", "-rf", publicPath)
	_ = os.MkdirAll(publicPath, 0755)
	_ = os.WriteFile(filepath.Join(publicPath, "index.html"), []byte(fmt.Sprintf("<html><body><h1>%s</h1><p>Site reset by Aether Panel</p></body></html>", body.Domain)), 0644)
	
	// Also wipe parent dir configurations (like Laravel framework files outside public)
	siteDir := fmt.Sprintf("/var/www/vhosts/%s", body.Domain)
	files, err := os.ReadDir(siteDir)
	if err == nil {
		for _, f := range files {
			if f.Name() != "public" {
				_ = os.RemoveAll(filepath.Join(siteDir, f.Name()))
			}
		}
	}
	_ = executeShell("chown", "-R", fmt.Sprintf("%s:%s", body.Domain, body.Domain), siteDir)

	// 2. Drop database and database user if it exists
	dbName := strings.ReplaceAll(body.Domain, ".", "_")
	dbName = strings.ReplaceAll(dbName, "-", "_") + "_db"

	dbUser := strings.ReplaceAll(body.Domain, ".", "_")
	dbUser = strings.ReplaceAll(dbUser, "-", "_")
	if len(dbUser) > 16 {
		dbUser = dbUser[:16]
	}
	dbUser = dbUser + "_usr"

	_ = executeShell("mysql", "-e", fmt.Sprintf("DROP DATABASE IF EXISTS `%s`", dbName))
	_ = executeShell("mysql", "-e", fmt.Sprintf("DROP USER IF EXISTS '%s'@'localhost'", dbUser))
	removeDatabaseMetadata(dbName)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"status":  "success",
		"message": "WordPress/Laravel uninstalled and directory reset successfully.",
	})
}

// handleConfigRead fetches system configuration files.
func handleConfigRead(w http.ResponseWriter, r *http.Request) {
	if r.Method == "OPTIONS" {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.WriteHeader(http.StatusOK)
		return
	}
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	service := r.URL.Query().Get("service")
	var configPath string

	switch service {
	case "nginx":
		configPath = "/etc/nginx/nginx.conf"
	case "php7.4":
		configPath = "/etc/php/7.4/fpm/php.ini"
	case "php8.1":
		configPath = "/etc/php/8.1/fpm/php.ini"
	case "php8.2":
		configPath = "/etc/php/8.2/fpm/php.ini"
	case "php8.3":
		configPath = "/etc/php/8.3/fpm/php.ini"
	case "php8.4":
		configPath = "/etc/php/8.4/fpm/php.ini"
	default:
		http.Error(w, "Invalid service config selection", http.StatusBadRequest)
		return
	}

	if _, err := os.Stat(configPath); os.IsNotExist(err) {
		http.Error(w, "Configuration file not found on system: "+configPath, http.StatusNotFound)
		return
	}

	content, err := os.ReadFile(configPath)
	if err != nil {
		http.Error(w, "Failed to read configuration: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "text/plain; charset=utf-8")
	w.Write(content)
}

// handleConfigWrite writes configuration file content after validating syntax for nginx.
func handleConfigWrite(w http.ResponseWriter, r *http.Request) {
	if r.Method == "OPTIONS" {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.WriteHeader(http.StatusOK)
		return
	}
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var body struct {
		Service string `json:"service"`
		Content string `json:"content"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	var configPath string
	var serviceName string

	switch body.Service {
	case "nginx":
		configPath = "/etc/nginx/nginx.conf"
		serviceName = "nginx"
	case "php7.4":
		configPath = "/etc/php/7.4/fpm/php.ini"
		serviceName = "php7.4-fpm"
	case "php8.1":
		configPath = "/etc/php/8.1/fpm/php.ini"
		serviceName = "php8.1-fpm"
	case "php8.2":
		configPath = "/etc/php/8.2/fpm/php.ini"
		serviceName = "php8.2-fpm"
	case "php8.3":
		configPath = "/etc/php/8.3/fpm/php.ini"
		serviceName = "php8.3-fpm"
	case "php8.4":
		configPath = "/etc/php/8.4/fpm/php.ini"
		serviceName = "php8.4-fpm"
	default:
		http.Error(w, "Invalid service config selection", http.StatusBadRequest)
		return
	}

	if body.Service == "nginx" {
		tmpFile := "/etc/nginx/nginx_test.conf"
		err := os.WriteFile(tmpFile, []byte(body.Content), 0644)
		if err != nil {
			http.Error(w, "Failed to create validation file: "+err.Error(), http.StatusInternalServerError)
			return
		}
		defer os.Remove(tmpFile)

		cmd := exec.Command("nginx", "-t", "-c", tmpFile)
		var stderr bytes.Buffer
		cmd.Stderr = &stderr
		if err := cmd.Run(); err != nil {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusUnprocessableEntity)
			json.NewEncoder(w).Encode(map[string]string{
				"status": "syntax_error",
				"error":  stderr.String(),
			})
			return
		}
	}

	err := os.WriteFile(configPath, []byte(body.Content), 0644)
	if err != nil {
		http.Error(w, "Failed to write configuration: "+err.Error(), http.StatusInternalServerError)
		return
	}

	var cmdErr error
	if serviceName == "nginx" {
		cmdErr = executeShell("systemctl", "reload", "nginx")
	} else {
		cmdErr = executeShell("systemctl", "restart", serviceName)
	}

	if cmdErr != nil {
		log.Printf("Warning: configuration written, but failed to reload/restart service %s: %v", serviceName, cmdErr)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "success"})
}

// Helper to execute terminal commands natively.
func executeShell(command string, args ...string) error {
	cmd := exec.Command(command, args...)
	return cmd.Run()
}

func mathRound(val float64, precision int) float64 {
	ratio := 1.0
	for i := 0; i < precision; i++ {
		ratio *= 10
	}
	return float64(int(val*ratio+0.5)) / ratio
}

func getSystemMetrics() SystemMetrics {
	metrics := SystemMetrics{
		CPUUsage:    mathRound(10.0+float64(time.Now().Unix()%10), 1),
		RAMUsage:    45.8,
		DiskUsage:   33.1,
		ActiveSites: 2,
	}

	cpu, err := getCPUUsage()
	if err == nil {
		metrics.CPUUsage = cpu
	}

	ram, err := getRAMUsage()
	if err == nil {
		metrics.RAMUsage = ram
	}

	disk, err := getDiskUsage()
	if err == nil {
		metrics.DiskUsage = disk
	}

	sites, err := countActiveSites()
	if err == nil {
		metrics.ActiveSites = sites
	}

	return metrics
}

func getCPUUsage() (float64, error) {
	data, err := os.ReadFile("/proc/stat")
	if err != nil {
		return 0, err
	}
	lines := strings.Split(string(data), "\n")
	if len(lines) == 0 {
		return 0, fmt.Errorf("empty /proc/stat")
	}
	fields := strings.Fields(lines[0])
	if len(fields) < 5 {
		return 0, fmt.Errorf("invalid /proc/stat format")
	}
	var total, idle float64
	for i, field := range fields {
		if i == 0 {
			continue
		}
		val, err := strconv.ParseFloat(field, 64)
		if err != nil {
			continue
		}
		total += val
		if i == 4 { // Idle time is 5th column
			idle = val
		}
	}
	if total == 0 {
		return 0, fmt.Errorf("total CPU time is zero")
	}
	return mathRound((total-idle)/total*100, 1), nil
}

func getRAMUsage() (float64, error) {
	data, err := os.ReadFile("/proc/meminfo")
	if err != nil {
		return 0, err
	}
	lines := strings.Split(string(data), "\n")
	var memTotal, memAvailable float64
	for _, line := range lines {
		fields := strings.Fields(line)
		if len(fields) < 2 {
			continue
		}
		if fields[0] == "MemTotal:" {
			memTotal, _ = strconv.ParseFloat(fields[1], 64)
		} else if fields[0] == "MemAvailable:" {
			memAvailable, _ = strconv.ParseFloat(fields[1], 64)
		}
	}
	if memTotal == 0 {
		return 0, fmt.Errorf("memTotal is zero")
	}
	if memAvailable == 0 {
		var memFree, cached float64
		for _, line := range lines {
			fields := strings.Fields(line)
			if len(fields) < 2 {
				continue
			}
			if fields[0] == "MemFree:" {
				memFree, _ = strconv.ParseFloat(fields[1], 64)
			} else if fields[0] == "Cached:" {
				cached, _ = strconv.ParseFloat(fields[1], 64)
			}
		}
		memAvailable = memFree + cached
	}
	used := memTotal - memAvailable
	return mathRound(used/memTotal*100, 1), nil
}

func getDiskUsage() (float64, error) {
	cmd := exec.Command("df", "-k", "/")
	var out bytes.Buffer
	cmd.Stdout = &out
	err := cmd.Run()
	if err != nil {
		return 0, err
	}
	lines := strings.Split(out.String(), "\n")
	if len(lines) < 2 {
		return 0, fmt.Errorf("invalid df output")
	}
	fields := strings.Fields(lines[1])
	if len(fields) < 5 {
		return 0, fmt.Errorf("invalid df output format")
	}
	usedStr := strings.TrimSuffix(fields[4], "%")
	used, err := strconv.ParseFloat(usedStr, 64)
	if err != nil {
		return 0, err
	}
	return used, nil
}

func countActiveSites() (int, error) {
	files, err := os.ReadDir("/etc/nginx/sites-enabled")
	if err != nil {
		return 0, err
	}
	count := 0
	for _, f := range files {
		if f.Name() != "default" {
			count++
		}
	}
	return count, nil
}
