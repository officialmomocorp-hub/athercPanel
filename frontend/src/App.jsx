import React, { useState, useEffect } from 'react';
import SiteCard from './components/SiteCard';
import Login from './components/Login';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('aether_token') || '');
  const [metrics, setMetrics] = useState({ cpuUsage: 0, ramUsage: 0, diskUsage: 0, activeSites: 0 });
  const [sites, setSites] = useState([]);
  const [services, setServices] = useState([]);
  const [firewallRules, setFirewallRules] = useState({ status: 'inactive', rules: [] });

  // Migration form state
  const [migrationForm, setMigrationForm] = useState({
    remoteHost: '', remotePort: 22, remoteUser: '', remotePass: '',
    remoteWebRoot: '', remoteDBHost: '127.0.0.1', remoteDBPort: 3306,
    remoteDBUser: '', remoteDBPass: '', remoteDBName: '',
    localDomain: '', localPHPVer: '8.3'
  });

  const [migrating, setMigrating] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState('');
  const [showMigrationModal, setShowMigrationModal] = useState(false);
  const [showAddSiteModal, setShowAddSiteModal] = useState(false);
  const [showCreateDBModal, setShowCreateDBModal] = useState(false);
  const [gdriveConnected, setGdriveConnected] = useState(false);
  const [gdriveMode, setGdriveMode] = useState('oauth');

  // Add Site form
  const [newSiteDomain, setNewSiteDomain] = useState('');
  const [newSitePHP, setNewSitePHP] = useState('8.3');
  const [addingSite, setAddingSite] = useState(false);

  // Create DB form
  const [newDBName, setNewDBName] = useState('');
  const [newDBUser, setNewDBUser] = useState('');
  const [newDBPass, setNewDBPass] = useState('');
  const [creatingDB, setCreatingDB] = useState(false);
  const [dbResult, setDbResult] = useState(null);
  const [databases, setDatabases] = useState([]);

  // Firewall form
  const [fwPort, setFwPort] = useState('');
  const [fwAction, setFwAction] = useState('allow');
  const [applyingFW, setApplyingFW] = useState(false);

  // App Installer state
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [installApp, setInstallApp] = useState('');
  const [installDomain, setInstallDomain] = useState('');
  const [installing, setInstalling] = useState(false);
  const [installStatus, setInstallStatus] = useState('');
  const [installerMode, setInstallerMode] = useState('install');

  // 1-Click Template Installer state
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateInstallDomain, setTemplateInstallDomain] = useState('');
  const [templateInstallType, setTemplateInstallType] = useState('ecommerce');
  const [templateInstallStatus, setTemplateInstallStatus] = useState('');
  const [templateInstalling, setTemplateInstalling] = useState(false);

  // Service Config state
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configService, setConfigService] = useState('');
  const [configContent, setConfigContent] = useState('');
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [configError, setConfigError] = useState('');
  const [configSuccess, setConfigSuccess] = useState('');

  // cPanel Redesign navigation & filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [showFileManagerSelector, setShowFileManagerSelector] = useState(false);
  const [selectedFileManagerDomain, setSelectedFileManagerDomain] = useState('');
  const [showDBManagerModal, setShowDBManagerModal] = useState(false);
  const [showDomainsManagerModal, setShowDomainsManagerModal] = useState(false);
  const [showFWManagerModal, setShowFWManagerModal] = useState(false);
  const [showPHPManagerModal, setShowPHPManagerModal] = useState(false);
  const [showServiceManagerModal, setShowServiceManagerModal] = useState(false);
  const [activeSidebarItem, setActiveSidebarItem] = useState('tools');
  const [collapsedCategories, setCollapsedCategories] = useState({});

  // Terminal state
  const [showTerminalModal, setShowTerminalModal] = useState(false);
  const [terminalHistory, setTerminalHistory] = useState([]);
  const [terminalCmd, setTerminalCmd] = useState('');
  const [terminalCwd, setTerminalCwd] = useState('/var/www/vhosts');
  const [terminalRunning, setTerminalRunning] = useState(false);
  const [terminalCmdHistory, setTerminalCmdHistory] = useState([]);
  const [terminalHistoryIndex, setTerminalHistoryIndex] = useState(-1);

  // Cron Jobs state
  const [showCronModal, setShowCronModal] = useState(false);
  const [cronJobs, setCronJobs] = useState([]);
  const [cronTiming, setCronTiming] = useState('* * * * *');
  const [cronCommand, setCronCommand] = useState('');
  const [cronSaving, setCronSaving] = useState(false);
  const [cronLoading, setCronLoading] = useState(false);

  // Directory Privacy state
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [privacyRules, setPrivacyRules] = useState([]);
  const [privacyDomain, setPrivacyDomain] = useState('');
  const [privacyPath, setPrivacyPath] = useState('');
  const [privacyUser, setPrivacyUser] = useState('');
  const [privacyPass, setPrivacyPass] = useState('');
  const [privacySaving, setPrivacySaving] = useState(false);
  const [privacyLoading, setPrivacyLoading] = useState(false);

  // Remote MySQL state
  const [showRemoteDBModal, setShowRemoteDBModal] = useState(false);
  const [remoteDBEnabled, setRemoteDBEnabled] = useState(false);
  const [remoteDBIPs, setRemoteDBIPs] = useState([]);
  const [remoteDBNewIP, setRemoteDBNewIP] = useState('');
  const [remoteDBLoading, setRemoteDBLoading] = useState(false);
  const [remoteDBToggling, setRemoteDBToggling] = useState(false);

  // MultiPHP INI Editor state
  const [showIniModal, setShowIniModal] = useState(false);
  const [iniDomain, setIniDomain] = useState('');
  const [iniMemoryLimit, setIniMemoryLimit] = useState('128M');
  const [iniUploadLimit, setIniUploadLimit] = useState('64M');
  const [iniPostLimit, setIniPostLimit] = useState('64M');
  const [iniExecTime, setIniExecTime] = useState('120');
  const [iniInputVars, setIniInputVars] = useState('1000');
  const [iniLoading, setIniLoading] = useState(false);
  const [iniSaving, setIniSaving] = useState(false);

  // Google Drive Backup state
  const [backupFolderId, setBackupFolderId] = useState('');
  const [backupServiceAccountKey, setBackupServiceAccountKey] = useState('');
  const [backupEnabled, setBackupEnabled] = useState(false);
  const [backupLogs, setBackupLogs] = useState([]);
  const [backupRunning, setBackupRunning] = useState(false);
  const [backupStatus, setBackupStatus] = useState('Idle');
  const [backupConfigLoading, setBackupConfigLoading] = useState(false);
  const [backupConfigSaving, setBackupConfigSaving] = useState(false);
  const [backupKeyConfigured, setBackupKeyConfigured] = useState(false);

  // Security Center state
  const [showSecurityCenterModal, setShowSecurityCenterModal] = useState(false);
  const [securityActiveTab, setSecurityActiveTab] = useState('waf');
  const [fail2banJails, setFail2banJails] = useState([]);
  const [fail2banLoading, setFail2banLoading] = useState(false);
  const [scanHistory, setScanHistory] = useState([]);
  const [scanHistoryLoading, setScanHistoryLoading] = useState(false);
  const [scanStatus, setScanStatus] = useState(null);
  const [scanningDomain, setScanningDomain] = useState('');
  const [scanActionLoading, setScanActionLoading] = useState(false);
  const [wafToggling, setWafToggling] = useState(null);

  // Website Builder state
  const [showWebBuilderModal, setShowWebBuilderModal] = useState(false);
  const [webBuilderDomain, setWebBuilderDomain] = useState('');
  const [webBuilderLoading, setWebBuilderLoading] = useState(false);
  const [webBuilderPublishing, setWebBuilderPublishing] = useState(false);
  const [webBuilderSaving, setWebBuilderSaving] = useState(false);
  const [editorInstance, setEditorInstance] = useState(null);



  const toggleCategoryCollapse = (catId) => {
    setCollapsedCategories(prev => ({
      ...prev,
      [catId]: !prev[catId]
    }));
  };



  const handleLoginSuccess = (newToken) => {
    localStorage.setItem('aether_token', newToken);
    setToken(newToken);
  };

  const handleLogout = () => {
    localStorage.removeItem('aether_token');
    setToken('');
    setSites([]);
  };

  const apiFetch = async (url, options = {}) => {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    });
    if (res.status === 401) {
      handleLogout();
      return null;
    }
    return res;
  };

  const fetchSites = async () => {
    if (!token) return;
    try {
      const res = await apiFetch('/api/sites');
      if (res && res.ok) {
        const data = await res.json();
        setSites(data || []);
      }
    } catch (err) {
      console.error('Failed to fetch sites:', err);
    }
  };

  const fetchServices = async () => {
    if (!token) return;
    try {
      const res = await apiFetch('/api/services');
      if (res && res.ok) {
        const data = await res.json();
        setServices(data || []);
      }
    } catch (err) {
      console.error('Failed to fetch services:', err);
    }
  };

  const fetchFirewallRules = async () => {
    if (!token) return;
    try {
      const res = await apiFetch('/api/firewall/rules');
      if (res && res.ok) {
        const data = await res.json();
        setFirewallRules(data || { status: 'inactive', rules: [] });
      }
    } catch (err) {
      console.error('Failed to fetch firewall rules:', err);
    }
  };

  const fetchDatabases = async () => {
    if (!token) return;
    try {
      const res = await apiFetch('/api/db/list');
      if (res && res.ok) {
        const data = await res.json();
        setDatabases(data || []);
      }
    } catch (err) {
      console.error('Failed to fetch databases:', err);
    }
  };

  useEffect(() => {
    if (!token) return;

    const fetchMetrics = async () => {
      try {
        const res = await apiFetch('/api/metrics');
        if (res && res.ok) {
          const data = await res.json();
          setMetrics(data);
        }
      } catch (err) {
        setMetrics({
          cpuUsage: 5.0,
          ramUsage: 12.0,
          diskUsage: 25.0,
          activeSites: sites.length
        });
      }
    };

    fetchMetrics();
    fetchSites();
    fetchServices();
    fetchFirewallRules();
    fetchDatabases();

    const interval = setInterval(() => {
      fetchMetrics();
      fetchSites();
    }, 4000);

    const slowInterval = setInterval(() => {
      fetchServices();
      fetchFirewallRules();
      fetchDatabases();
    }, 15000);

    return () => { clearInterval(interval); clearInterval(slowInterval); };
  }, [token]);

  // Add Website handler
  const handleAddSite = async (e) => {
    e.preventDefault();
    setAddingSite(true);
    try {
      const res = await apiFetch('/api/sites/create', {
        method: 'POST',
        body: JSON.stringify({ domain: newSiteDomain, phpVersion: newSitePHP })
      });
      if (res && res.ok) {
        setShowAddSiteModal(false);
        setNewSiteDomain('');
        setNewSitePHP('8.3');
        await fetchSites();
      }
    } catch (err) {
      console.error(err);
    }
    setAddingSite(false);
  };

  // Service control handler
  const handleServiceControl = async (service, action) => {
    try {
      const res = await apiFetch('/api/services/control', {
        method: 'POST',
        body: JSON.stringify({ service, action })
      });
      if (res && res.ok) {
        await fetchServices();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Delete Database handler
  const handleDeleteDB = async (dbName) => {
    if (!window.confirm(`Are you sure you want to permanently delete database ${dbName}?`)) return;
    try {
      const res = await apiFetch('/api/db/delete', {
        method: 'POST',
        body: JSON.stringify({ dbName })
      });
      if (res && res.ok) {
        await fetchDatabases();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Create Database handler
  const handleCreateDB = async (e) => {
    e.preventDefault();
    setCreatingDB(true);
    setDbResult(null);
    try {
      const res = await apiFetch('/api/db/create', {
        method: 'POST',
        body: JSON.stringify({ dbName: newDBName, dbUser: newDBUser, dbPass: newDBPass })
      });
      if (res && res.ok) {
        const data = await res.json();
        setDbResult(data);
        await fetchDatabases();
      }
    } catch (err) {
      console.error(err);
    }
    setCreatingDB(false);
  };

  // Firewall rule handler
  const handleApplyFW = async () => {
    if (!fwPort) return;
    setApplyingFW(true);
    try {
      const res = await apiFetch('/api/firewall/rule', {
        method: 'POST',
        body: JSON.stringify({ action: fwAction, port: fwPort })
      });
      if (res && res.ok) {
        setFwPort('');
        await fetchFirewallRules();
      }
    } catch (err) {
      console.error(err);
    }
    setApplyingFW(false);
  };

  const pollMigrationStatus = (jobId) => {
    const checkStatus = async () => {
      try {
        const res = await apiFetch(`/api/migrate/status?jobId=${jobId}`);
        if (res && res.ok) {
          const data = await res.json();
          if (data.status === 'completed') {
            await fetchSites();
            setMigrating(false);
            setShowMigrationModal(false);
            setMigrationStatus('');
          } else if (data.status === 'failed') {
            setMigrationStatus(`Failed: ${data.message}`);
            setMigrating(false);
          } else {
            setMigrationStatus(`Active: ${data.message}`);
            setTimeout(checkStatus, 1500);
          }
        } else {
          setMigrationStatus('Failed to query task status.');
          setMigrating(false);
        }
      } catch (err) {
        setMigrationStatus('Connection lost during status checks.');
        setMigrating(false);
      }
    };
    setTimeout(checkStatus, 1000);
  };

  const handleMigrationSubmit = async (e) => {
    e.preventDefault();
    setMigrating(true);
    setMigrationStatus('Scanning remote workspace structure...');
    try {
      const res = await apiFetch('/api/migrate', {
        method: 'POST',
        body: JSON.stringify(migrationForm)
      });
      if (res && res.ok) {
        const data = await res.json();
        setMigrationStatus('Task initialized. Starting status tracking...');
        pollMigrationStatus(data.jobId);
      } else {
        const errText = res ? await res.text() : 'Connection failed';
        setMigrationStatus(`Failed: ${errText}`);
        setMigrating(false);
      }
    } catch (err) {
      setMigrationStatus('Connection refused. Migration failed.');
      setMigrating(false);
    }
  };

  const pollInstallStatus = (jobId) => {
    const checkStatus = async () => {
      try {
        const res = await apiFetch(`/api/migrate/status?jobId=${jobId}`);
        if (res && res.ok) {
          const data = await res.json();
          if (data.status === 'completed') {
            await fetchSites();
            setInstalling(false);
            setInstallStatus(`Success: ${data.message}`);
            setTimeout(() => {
              setShowInstallModal(false);
              setInstallStatus('');
              setInstallDomain('');
            }, 3000);
          } else if (data.status === 'failed') {
            setInstallStatus(`Failed: ${data.message}`);
            setInstalling(false);
          } else {
            setInstallStatus(`Active: ${data.message}`);
            setTimeout(checkStatus, 1500);
          }
        } else {
          setInstallStatus('Failed to query task status.');
          setInstalling(false);
        }
      } catch (err) {
        setInstallStatus('Connection lost during status checks.');
        setInstalling(false);
      }
    };
    setTimeout(checkStatus, 1000);
  };

  const handleInstallSubmit = async (e) => {
    e.preventDefault();
    if (!installDomain || !installApp) return;
    setInstalling(true);
    if (installerMode === 'uninstall') {
      if (!window.confirm(`Are you sure you want to completely uninstall ${installApp} from ${installDomain}? This will delete all files in the public directory and drop the associated database!`)) {
        setInstalling(false);
        return;
      }
      setInstallStatus('Wiping files and database tables...');
      try {
        const res = await apiFetch('/api/uninstall', {
          method: 'POST',
          body: JSON.stringify({ domain: installDomain })
        });
        if (res && res.ok) {
          setInstallStatus('Success: Application uninstalled successfully.');
          await fetchSites();
          await fetchDatabases();
          setTimeout(() => {
            setShowInstallModal(false);
            setInstallStatus('');
            setInstallDomain('');
            setInstallerMode('install');
          }, 3000);
        } else {
          const errText = res ? await res.text() : 'Connection failed';
          setInstallStatus(`Failed: ${errText}`);
        }
      } catch (err) {
        setInstallStatus('Uninstall failed due to network error.');
      }
      setInstalling(false);
      return;
    }
    setInstallStatus('Initializing installation...');
    try {
      const res = await apiFetch('/api/install', {
        method: 'POST',
        body: JSON.stringify({ domain: installDomain, app: installApp })
      });
      if (res && res.ok) {
        const data = await res.json();
        setInstallStatus('Task initialized. Starting status tracking...');
        pollInstallStatus(data.jobId);
      } else {
        const errText = res ? await res.text() : 'Connection failed';
        setInstallStatus(`Failed: ${errText}`);
        setInstalling(false);
      }
    } catch (err) {
      setInstallStatus('Connection refused. Installation failed.');
      setInstalling(false);
    }
  };

  const pollTemplateStatus = (jobId) => {
    const checkStatus = async () => {
      try {
        const res = await apiFetch(`/api/migrate/status?jobId=${jobId}`);
        if (res && res.ok) {
          const data = await res.json();
          if (data.status === 'completed') {
            await fetchSites();
            await fetchDatabases();
            setTemplateInstalling(false);
            setTemplateInstallStatus(`Success: ${data.message}`);
            setTimeout(() => {
              setShowTemplateModal(false);
              setTemplateInstallStatus('');
              setTemplateInstallDomain('');
            }, 3000);
          } else if (data.status === 'failed') {
            setTemplateInstallStatus(`Failed: ${data.message}`);
            setTemplateInstalling(false);
          } else {
            setTemplateInstallStatus(`Progress: ${data.message}`);
            setTimeout(checkStatus, 1500);
          }
        } else {
          setTemplateInstallStatus('Failed to query status.');
          setTemplateInstalling(false);
        }
      } catch (err) {
        setTemplateInstallStatus('Connection lost during status checks.');
        setTemplateInstalling(false);
      }
    };
    setTimeout(checkStatus, 1000);
  };

  const handleTemplateInstallSubmit = async (e) => {
    e.preventDefault();
    if (!templateInstallDomain || !templateInstallType) return;
    setTemplateInstalling(true);
    setTemplateInstallStatus('Initializing installation...');
    try {
      const res = await apiFetch('/api/templates/install', {
        method: 'POST',
        body: JSON.stringify({ domain: templateInstallDomain, template: templateInstallType })
      });
      if (res && res.ok) {
        const data = await res.json();
        setTemplateInstallStatus('Task initialized. Starting status tracking...');
        pollTemplateStatus(data.jobId);
      } else {
        const errText = res ? await res.text() : 'Connection failed';
        setTemplateInstallStatus(`Failed: ${errText}`);
        setTemplateInstalling(false);
      }
    } catch (err) {
      setTemplateInstallStatus('Connection refused. Installation failed.');
      setTemplateInstalling(false);
    }
  };

  const handleOpenConfig = async (service) => {
    setConfigService(service);
    setLoadingConfig(true);
    setConfigContent('');
    setConfigError('');
    setConfigSuccess('');
    setShowConfigModal(true);
    try {
      const res = await apiFetch(`/api/config/read?service=${service}`);
      if (res && res.ok) {
        const text = await res.text();
        setConfigContent(text);
      } else {
        const errText = res ? await res.text() : 'Failed to fetch config';
        setConfigError(errText);
      }
    } catch (err) {
      setConfigError('Connection error. Failed to retrieve config.');
    }
    setLoadingConfig(false);
  };

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    setSavingConfig(true);
    setConfigError('');
    setConfigSuccess('');
    try {
      const res = await apiFetch('/api/config/write', {
        method: 'POST',
        body: JSON.stringify({ service: configService, content: configContent })
      });
      if (res) {
        if (res.ok) {
          setConfigSuccess('Configuration saved and service reloaded successfully!');
          await fetchServices();
          setTimeout(() => {
            setShowConfigModal(false);
          }, 2000);
        } else if (res.status === 422) {
          const data = await res.json();
          setConfigError(`Syntax Error:\n${data.error}`);
        } else {
          const errText = await res.text();
          setConfigError(errText || 'Failed to save configuration');
        }
      } else {
        setConfigError('Connection failed.');
      }
    } catch (err) {
      setConfigError('Network error. Failed to save configuration.');
    }
    setSavingConfig(false);
  };

  const handleUpdatePHP = async (domain, version) => {
    try {
      const res = await apiFetch('/api/sites/php', {
        method: 'POST',
        body: JSON.stringify({ domain, version })
      });
      if (res && res.ok) await fetchSites();
    } catch (e) { console.error(e); }
  };

  const handleToggleRedis = async (domain, enabled) => {
    try {
      const res = await apiFetch('/api/sites/redis', {
        method: 'POST',
        body: JSON.stringify({ domain, enabled })
      });
      if (res && res.ok) await fetchSites();
    } catch (e) { console.error(e); }
  };

  const handleProvisionSSL = async (domain) => {
    try {
      const res = await apiFetch('/api/ssl/issue', {
        method: 'POST',
        body: JSON.stringify({ domain })
      });
      if (res && res.ok) setTimeout(fetchSites, 2000);
    } catch (e) { console.error(e); }
  };

  const handleDeleteSite = async (domain) => {
    try {
      const res = await apiFetch('/api/sites/delete', {
        method: 'POST',
        body: JSON.stringify({ domain })
      });
      if (res && res.ok) await fetchSites();
    } catch (e) { console.error(e); }
  };

  const triggerGDriveOAuth = () => {
    const clientID = "YOUR_CLIENT_ID.apps.googleusercontent.com";
    const redirectURI = `https://${window.location.host}/api/gdrive/connect`;
    const scope = "https://www.googleapis.com/auth/drive.file";
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientID}&redirect_uri=${encodeURIComponent(redirectURI)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent`;
  };

  // ===== Terminal handlers =====
  const handleTerminalSubmit = async (e) => {
    e.preventDefault();
    if (!terminalCmd.trim() || terminalRunning) return;
    const cmd = terminalCmd.trim();
    setTerminalRunning(true);
    setTerminalHistory(prev => [...prev, { type: 'input', text: `root@aether:${terminalCwd}# ${cmd}` }]);
    setTerminalCmdHistory(prev => [cmd, ...prev]);
    setTerminalHistoryIndex(-1);
    setTerminalCmd('');
    try {
      const res = await apiFetch('/api/terminal', {
        method: 'POST',
        body: JSON.stringify({ cmd, cwd: terminalCwd })
      });
      if (res && res.ok) {
        const data = await res.json();
        if (data.output) {
          setTerminalHistory(prev => [...prev, { type: 'output', text: data.output }]);
        }
        if (data.cwd) setTerminalCwd(data.cwd);
      } else {
        setTerminalHistory(prev => [...prev, { type: 'error', text: 'Command failed.' }]);
      }
    } catch (err) {
      setTerminalHistory(prev => [...prev, { type: 'error', text: 'Network error.' }]);
    }
    setTerminalRunning(false);
  };

  const handleTerminalKeyDown = (e) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const newIdx = Math.min(terminalHistoryIndex + 1, terminalCmdHistory.length - 1);
      setTerminalHistoryIndex(newIdx);
      if (terminalCmdHistory[newIdx]) setTerminalCmd(terminalCmdHistory[newIdx]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const newIdx = Math.max(terminalHistoryIndex - 1, -1);
      setTerminalHistoryIndex(newIdx);
      setTerminalCmd(newIdx >= 0 ? terminalCmdHistory[newIdx] : '');
    }
  };

  // ===== Google Drive Backup handlers =====
  const fetchBackupConfig = async () => {
    setBackupConfigLoading(true);
    try {
      const res = await apiFetch('/api/backup/config');
      if (res && res.ok) {
        const data = await res.json();
        setBackupEnabled(data.enabled);
        setBackupFolderId(data.folder_id);
        setBackupKeyConfigured(data.has_key);
      }
    } catch (e) {
      console.error(e);
    }
    setBackupConfigLoading(false);
  };

  const fetchBackupStatus = async () => {
    try {
      const res = await apiFetch('/api/backup/status');
      if (res && res.ok) {
        const data = await res.json();
        setBackupRunning(data.running);
        setBackupStatus(data.status);
        setBackupLogs(data.logs || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveBackupConfig = async (e) => {
    e.preventDefault();
    setBackupConfigSaving(true);
    try {
      const res = await apiFetch('/api/backup/config', {
        method: 'POST',
        body: JSON.stringify({
          enabled: backupEnabled,
          folder_id: backupFolderId,
          service_account_json: backupServiceAccountKey
        })
      });
      if (res && res.ok) {
        alert("Backup configuration saved successfully!");
        setBackupServiceAccountKey('');
        await fetchBackupConfig();
      } else {
        const msg = await res.text();
        alert("Failed to save config: " + msg);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to connect to panel API");
    }
    setBackupConfigSaving(false);
  };

  const handleTriggerBackup = async () => {
    try {
      const res = await apiFetch('/api/backup/run', { method: 'POST' });
      if (res && res.ok) {
        setBackupRunning(true);
        setBackupStatus("Initializing backup process...");
        fetchBackupStatus();
      } else {
        const msg = await res.text();
        alert("Failed to start backup: " + msg);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (gdriveConnected) {
      fetchBackupConfig();
      fetchBackupStatus();
    }
  }, [gdriveConnected]);

  useEffect(() => {
    let interval;
    if (gdriveConnected && backupRunning) {
      interval = setInterval(() => {
        fetchBackupStatus();
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [gdriveConnected, backupRunning]);

  // ===== Cron handlers =====
  const fetchCronJobs = async () => {
    setCronLoading(true);
    try {
      const res = await apiFetch('/api/cron');
      if (res && res.ok) {
        const data = await res.json();
        setCronJobs(data || []);
      }
    } catch (err) { console.error(err); }
    setCronLoading(false);
  };

  const handleCronSave = async (e) => {
    e.preventDefault();
    if (!cronCommand.trim()) return;
    setCronSaving(true);
    try {
      const res = await apiFetch('/api/cron/save', {
        method: 'POST',
        body: JSON.stringify({ timing: cronTiming, command: cronCommand })
      });
      if (res && res.ok) {
        setCronCommand('');
        setCronTiming('* * * * *');
        await fetchCronJobs();
      }
    } catch (err) { console.error(err); }
    setCronSaving(false);
  };

  const handleCronDelete = async (job) => {
    if (!window.confirm(`Delete cron job: ${job.timing} ${job.command}?`)) return;
    try {
      await apiFetch('/api/cron/delete', {
        method: 'POST',
        body: JSON.stringify({ timing: job.timing, command: job.command })
      });
      await fetchCronJobs();
    } catch (err) { console.error(err); }
  };

  // ===== Privacy handlers =====
  const fetchPrivacyRules = async (domain) => {
    if (!domain) return;
    setPrivacyLoading(true);
    try {
      const res = await apiFetch(`/api/privacy?domain=${domain}`);
      if (res && res.ok) {
        const data = await res.json();
        setPrivacyRules(data || []);
      }
    } catch (err) { console.error(err); }
    setPrivacyLoading(false);
  };

  const handlePrivacySave = async (e) => {
    e.preventDefault();
    if (!privacyDomain || !privacyPath || !privacyUser || !privacyPass) return;
    setPrivacySaving(true);
    try {
      const res = await apiFetch('/api/privacy/save', {
        method: 'POST',
        body: JSON.stringify({
          domain: privacyDomain, path: privacyPath, username: privacyUser,
          password: privacyPass, realm: 'Restricted Access', enabled: true
        })
      });
      if (res && res.ok) {
        setPrivacyPath('');
        setPrivacyUser('');
        setPrivacyPass('');
        await fetchPrivacyRules(privacyDomain);
      }
    } catch (err) { console.error(err); }
    setPrivacySaving(false);
  };

  const handlePrivacyDelete = async (domain, path) => {
    if (!window.confirm(`Remove protection from ${path}?`)) return;
    try {
      await apiFetch('/api/privacy/delete', {
        method: 'POST',
        body: JSON.stringify({ domain, path })
      });
      await fetchPrivacyRules(domain);
    } catch (err) { console.error(err); }
  };

  // ===== Remote MySQL handlers =====
  const fetchRemoteDBStatus = async () => {
    setRemoteDBLoading(true);
    try {
      const res = await apiFetch('/api/db/remote');
      if (res && res.ok) {
        const data = await res.json();
        setRemoteDBEnabled(!!data.enabled);
        setRemoteDBIPs(data.ips || []);
      }
    } catch (err) { console.error(err); }
    setRemoteDBLoading(false);
  };

  const handleRemoteDBToggle = async () => {
    const newState = !remoteDBEnabled;
    if (newState && !window.confirm('WARNING: Enabling remote MySQL will open port 3306 to the internet. Are you sure?')) return;
    setRemoteDBToggling(true);
    try {
      const res = await apiFetch('/api/db/remote/toggle', {
        method: 'POST',
        body: JSON.stringify({ enabled: newState })
      });
      if (res && res.ok) setRemoteDBEnabled(newState);
    } catch (err) { console.error(err); }
    setRemoteDBToggling(false);
  };

  const handleRemoteDBAddIP = async (e) => {
    e.preventDefault();
    if (!remoteDBNewIP.trim()) return;
    try {
      const res = await apiFetch('/api/db/remote/ip/add', {
        method: 'POST',
        body: JSON.stringify({ ip: remoteDBNewIP.trim() })
      });
      if (res && res.ok) {
        setRemoteDBNewIP('');
        await fetchRemoteDBStatus();
      }
    } catch (err) { console.error(err); }
  };

  const handleRemoteDBRemoveIP = async (ip) => {
    if (!window.confirm(`Revoke access from IP ${ip}?`)) return;
    try {
      await apiFetch('/api/db/remote/ip/remove', {
        method: 'POST',
        body: JSON.stringify({ ip })
      });
      await fetchRemoteDBStatus();
    } catch (err) { console.error(err); }
  };

  // ===== Security Center handlers =====
  const fetchFail2banStatus = async () => {
    setFail2banLoading(true);
    try {
      const res = await apiFetch('/api/security/fail2ban');
      if (res && res.ok) {
        const data = await res.json();
        setFail2banJails(data || []);
      }
    } catch (err) {
      console.error('Failed to fetch Fail2ban status:', err);
    }
    setFail2banLoading(false);
  };

  const handleFail2banUnban = async (jail, ip) => {
    if (!window.confirm(`Are you sure you want to unban IP ${ip} from jail ${jail}?`)) return;
    try {
      const res = await apiFetch('/api/security/fail2ban/unban', {
        method: 'POST',
        body: JSON.stringify({ jail, ip })
      });
      if (res && res.ok) {
        alert(`Successfully unbanned IP ${ip}`);
        await fetchFail2banStatus();
      } else {
        alert('Failed to unban IP');
      }
    } catch (err) {
      console.error('Error unbanning IP:', err);
    }
  };

  const fetchScanHistory = async () => {
    setScanHistoryLoading(true);
    try {
      const res = await apiFetch('/api/security/scan/history');
      if (res && res.ok) {
        const data = await res.json();
        setScanHistory(data || []);
      }
    } catch (err) {
      console.error('Failed to fetch scan history:', err);
    }
    setScanHistoryLoading(false);
  };

  const fetchScanStatus = async () => {
    try {
      const res = await apiFetch('/api/security/scan/status');
      if (res && res.ok) {
        const data = await res.json();
        setScanStatus(data);
        if (data.running) {
          setTimeout(fetchScanStatus, 3000);
        } else {
          await fetchScanHistory();
        }
      }
    } catch (err) {
      console.error('Failed to fetch scan status:', err);
    }
  };

  const handleStartScan = async (e) => {
    e.preventDefault();
    if (!scanningDomain) return;
    setScanActionLoading(true);
    try {
      const res = await apiFetch('/api/security/scan', {
        method: 'POST',
        body: JSON.stringify({ domain: scanningDomain })
      });
      if (res && res.ok) {
        alert(`Malware scan triggered for ${scanningDomain}`);
        setTimeout(fetchScanStatus, 1000);
      } else if (res && res.status === 409) {
        alert('A malware scan is already running.');
      } else {
        alert('Failed to start scan.');
      }
    } catch (err) {
      console.error('Error starting scan:', err);
    }
    setScanActionLoading(false);
  };

  const handleToggleWAF = async (domain, enabled) => {
    setWafToggling(domain);
    try {
      const res = await apiFetch('/api/waf/toggle', {
        method: 'POST',
        body: JSON.stringify({ domain, enabled })
      });
      if (res && res.ok) {
        await fetchSites();
      } else {
        alert('Failed to update WAF settings.');
      }
    } catch (err) {
      console.error('Error toggling WAF:', err);
    }
    setWafToggling(null);
  };

  // ===== Website Builder handlers =====
  const loadGrapesJSAsets = () => {
    return new Promise((resolve) => {
      if (window.grapesjs) {
        resolve();
        return;
      }
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/grapesjs/dist/css/grapes.min.css';
      document.head.appendChild(link);

      const presetLink = document.createElement('link');
      presetLink.rel = 'stylesheet';
      presetLink.href = 'https://unpkg.com/grapesjs-preset-webpage/dist/grapesjs-preset-webpage.min.css';
      document.head.appendChild(presetLink);

      const script = document.createElement('script');
      script.src = 'https://unpkg.com/grapesjs';
      script.onload = () => {
        const presetScript = document.createElement('script');
        presetScript.src = 'https://unpkg.com/grapesjs-preset-webpage';
        presetScript.onload = () => {
          resolve();
        };
        document.body.appendChild(presetScript);
      };
      document.body.appendChild(script);
    });
  };

  const initWebBuilder = async (domain) => {
    if (!domain) return;
    setWebBuilderLoading(true);
    setWebBuilderDomain(domain);
    
    // Destroy previous editor if any
    if (editorInstance) {
      try {
        editorInstance.destroy();
      } catch (err) { console.error(err); }
      setEditorInstance(null);
    }

    try {
      await loadGrapesJSAsets();

      // Read draft data if exists
      let draftData = '';
      try {
        const res = await apiFetch(`/api/files/read?domain=${domain}&path=webbuilder_draft.json`);
        if (res && res.ok) {
          draftData = await res.text();
        }
      } catch (err) {
        console.log('No draft found, starting fresh:', err);
      }

      // Clear editor target div
      const targetDiv = document.getElementById('gjs');
      if (targetDiv) {
        targetDiv.innerHTML = '';
      }

      // Initialize grapesjs
      const editor = window.grapesjs.init({
        container: '#gjs',
        height: '65vh',
        width: '100%',
        fromElement: false,
        storageManager: false,
        plugins: ['gjs-preset-webpage'],
        pluginsOpts: {
          'gjs-preset-webpage': {}
        }
      });

      if (draftData) {
        try {
          editor.loadProjectData(JSON.parse(draftData));
        } catch (err) {
          console.error('Error parsing draft data:', err);
        }
      } else {
        editor.setComponents(`
          <section style="padding: 60px 20px; text-align: center; font-family: system-ui, -apple-system, sans-serif; background-color: #f8fafc; border-radius: 12px; margin: 20px;">
            <h1 style="font-size: 3.5rem; color: #0f172a; font-weight: 800; letter-spacing: -0.025em; margin-bottom: 16px; line-height: 1;">Welcome to Your Web Page</h1>
            <p style="font-size: 1.25rem; color: #475569; max-width: 600px; margin: 0 auto 32px; line-height: 1.625;">This responsive page was built instantly using the Aether Drag-and-Drop Editor. Start dragging blocks from the right pane to design your layout.</p>
            <a href="#" style="background-color: #ea580c; color: white; text-decoration: none; padding: 14px 28px; font-size: 0.875rem; border-radius: 9999px; font-weight: 700; display: inline-block; box-shadow: 0 4px 6px -1px rgba(234, 88, 12, 0.2); transition: all 0.2s;">Discover More</a>
          </section>
        `);
      }

      setEditorInstance(editor);
    } catch (err) {
      console.error('Failed to initialize editor:', err);
      alert('Failed to load website builder library. Check internet connection.');
    }
    setWebBuilderLoading(false);
  };

  const handleSaveDraft = async () => {
    if (!editorInstance || !webBuilderDomain) return;
    setWebBuilderSaving(true);
    try {
      const projectData = editorInstance.getProjectData();
      const res = await apiFetch('/api/files/write', {
        method: 'POST',
        body: JSON.stringify({
          domain: webBuilderDomain,
          path: 'webbuilder_draft.json',
          content: JSON.stringify(projectData)
        })
      });
      if (res && res.ok) {
        alert('Draft saved successfully.');
      } else {
        alert('Failed to save draft.');
      }
    } catch (err) {
      console.error('Error saving draft:', err);
      alert('Error saving draft.');
    }
    setWebBuilderSaving(false);
  };

  const handlePublishSite = async () => {
    if (!editorInstance || !webBuilderDomain) return;
    if (!window.confirm('WARNING: Publishing will compile your layout and completely overwrite your website\'s public/index.html. Are you sure?')) return;
    
    setWebBuilderPublishing(true);
    try {
      const html = editorInstance.getHtml();
      const css = editorInstance.getCss();

      const combinedHTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Published Site - ${webBuilderDomain}</title>
  <style>
    ${css}
  </style>
</head>
<body>
  ${html}
</body>
</html>`;

      // Save draft first
      const projectData = editorInstance.getProjectData();
      await apiFetch('/api/files/write', {
        method: 'POST',
        body: JSON.stringify({
          domain: webBuilderDomain,
          path: 'webbuilder_draft.json',
          content: JSON.stringify(projectData)
        })
      });

      // Write compiled index.html
      const res = await apiFetch('/api/files/write', {
        method: 'POST',
        body: JSON.stringify({
          domain: webBuilderDomain,
          path: 'public/index.html',
          content: combinedHTML
        })
      });

      if (res && res.ok) {
        alert(`Website published successfully to ${webBuilderDomain}!`);
      } else {
        alert('Failed to publish site.');
      }
    } catch (err) {
      console.error('Error publishing site:', err);
      alert('Error publishing site.');
    }
    setWebBuilderPublishing(false);
  };

  // ===== MultiPHP INI Editor handlers =====
  const fetchPHPSettings = async (domain) => {
    if (!domain) return;
    setIniLoading(true);
    try {
      const res = await apiFetch(`/api/php/ini?domain=${domain}`);
      if (res && res.ok) {
        const data = await res.json();
        setIniMemoryLimit(data.memory_limit || '128M');
        setIniUploadLimit(data.upload_max_filesize || '64M');
        setIniPostLimit(data.post_max_size || '64M');
        setIniExecTime(data.max_execution_time || '120');
        setIniInputVars(data.max_input_vars || '1000');
      }
    } catch (err) {
      console.error(err);
    }
    setIniLoading(false);
  };

  const handleSaveIniSettings = async (e) => {
    e.preventDefault();
    if (!iniDomain) return;
    setIniSaving(true);
    try {
      const res = await apiFetch('/api/php/ini/save', {
        method: 'POST',
        body: JSON.stringify({
          domain: iniDomain,
          memory_limit: iniMemoryLimit,
          upload_max_filesize: iniUploadLimit,
          post_max_size: iniPostLimit,
          max_execution_time: iniExecTime,
          max_input_vars: iniInputVars
        })
      });
      if (res && res.ok) {
        setShowIniModal(false);
        alert('PHP INI settings updated and FPM reloaded successfully!');
      }
    } catch (err) {
      console.error(err);
    }
    setIniSaving(false);
  };

  // Global File Manager State
  const [fmDomain, setFmDomain] = useState('');
  const [fmPath, setFmPath] = useState('');
  const [fmFiles, setFmFiles] = useState([]);
  const [fmSelectedFile, setFmSelectedFile] = useState(null);
  const [fmFileContent, setFmFileContent] = useState('');
  const [fmSaving, setFmSaving] = useState(false);
  const [fmLoading, setFmLoading] = useState(false);

  const fetchFmFiles = async (domain, path) => {
    setFmLoading(true);
    try {
      const res = await apiFetch(`/api/files?domain=${domain}&path=${encodeURIComponent(path)}`);
      if (res && res.ok) {
        const data = await res.json();
        setFmFiles(data || []);
      }
    } catch (e) {
      console.error('Failed to fetch FM files:', e);
    }
    setFmLoading(false);
  };

  const handleFmEditFile = async (fileName) => {
    const filePath = fmPath ? `${fmPath}/${fileName}` : fileName;
    try {
      const res = await apiFetch(`/api/files/read?domain=${fmDomain}&path=${encodeURIComponent(filePath)}`);
      if (res && res.ok) {
        const text = await res.text();
        setFmSelectedFile(filePath);
        setFmFileContent(text);
      }
    } catch (e) {
      console.error('Failed to read file:', e);
    }
  };

  const handleFmSaveFile = async () => {
    setFmSaving(true);
    try {
      const res = await apiFetch('/api/files/write', {
        method: 'POST',
        body: JSON.stringify({
          domain: fmDomain,
          path: fmSelectedFile,
          content: fmFileContent
        })
      });
      if (res && res.ok) {
        setFmSelectedFile(null);
        setFmFileContent('');
        await fetchFmFiles(fmDomain, fmPath);
      }
    } catch (e) {
      console.error('Failed to save file:', e);
    }
    setFmSaving(false);
  };

  const handleOpenPMA = async () => {
    try {
      const res = await apiFetch('/api/db/pma-session', { method: 'POST' });
      if (res && res.ok) {
        const data = await res.json();
        if (data.url) {
          window.open(data.url, '_blank');
        }
      } else {
        window.open(`https://${window.location.hostname}/phpmyadmin/`, '_blank');
      }
    } catch (err) {
      window.open(`https://${window.location.hostname}/phpmyadmin/`, '_blank');
    }
  };

  if (!token) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // cPanel category blocks mapping
  const categories = [
    {
      id: 'files',
      name: 'Files',
      items: [
        {
          name: 'File Manager',
          desc: 'Manage site files, directories and permissions',
          action: () => setShowFileManagerSelector(true),
          icon: (
            <svg className="w-8 h-8 text-[#ff6c2c]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          )
        },
        {
          name: 'Backup Manager',
          desc: 'Configure automated offsite Google Drive backups',
          action: () => setGdriveConnected(true),
          icon: (
            <svg className="w-8 h-8 text-sky-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
            </svg>
          )
        },
        {
          name: 'Directory Privacy',
          desc: 'Password-protect directories with HTTP Basic Auth',
          action: () => { setShowPrivacyModal(true); if (sites.length > 0 && !privacyDomain) { setPrivacyDomain(sites[0].domain); fetchPrivacyRules(sites[0].domain); } },
          icon: (
            <svg className="w-8 h-8 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
          )
        },
        {
          name: 'Disk Usage',
          desc: 'Monitor storage allocations and filesystem limits',
          action: () => alert(`Disk Usage: ${metrics.diskUsage}% NVMe`),
          icon: (
            <svg className="w-8 h-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z" />
            </svg>
          )
        }
      ]
    },
    {
      id: 'databases',
      name: 'Databases',
      items: [
        {
          name: 'MySQL Databases',
          desc: 'Create, drop and list user database privileges',
          action: () => setShowDBManagerModal(true),
          icon: (
            <svg className="w-8 h-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125v-3.75" />
            </svg>
          )
        },
        {
          name: 'phpMyAdmin',
          desc: 'Direct administrative access to SQL tables',
          action: handleOpenPMA,
          icon: (
            <svg className="w-8 h-8 text-cyan-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
          )
        },
        {
          name: 'Remote MySQL',
          desc: 'Enable remote database connections and whitelist IPs',
          action: () => { setShowRemoteDBModal(true); fetchRemoteDBStatus(); },
          icon: (
            <svg className="w-8 h-8 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
            </svg>
          )
        }
      ]
    },
    {
      id: 'domains',
      name: 'Domains',
      items: [
        {
          name: 'Domains',
          desc: 'Manage virtual hosts, directories, PHP & SSL settings',
          action: () => setShowDomainsManagerModal(true),
          icon: (
            <svg className="w-8 h-8 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3" />
            </svg>
          )
        },
        {
          name: 'Redirects / Site Mapping',
          desc: 'Configure domain mappings and Nginx index files',
          action: () => setShowDomainsManagerModal(true),
          icon: (
            <svg className="w-8 h-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          )
        }
      ]
    },
    {
      id: 'security',
      name: 'Security',
      items: [
        {
          name: 'SSH Access',
          desc: 'Manage SSH keys, remote terminals and ports',
          action: () => alert('SSH Access Info:\nCommand: ssh root@125.62.80.157 -p 22\nAuth Method: Password/Key verified.'),
          icon: (
            <svg className="w-8 h-8 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
            </svg>
          )
        },
        {
          name: 'SSL/TLS Status',
          desc: 'Issue and renew automated certificates via Let\'s Encrypt',
          action: () => setShowDomainsManagerModal(true),
          icon: (
            <svg className="w-8 h-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
          )
        },
        {
          name: 'IP Blocker / Firewall (UFW)',
          desc: 'Block/allow ports and restrict connections',
          action: () => setShowFWManagerModal(true),
          icon: (
            <svg className="w-8 h-8 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          )
        },
        {
          name: 'Security Center',
          desc: 'Manage ModSecurity WAF, Malware Scanner, and Fail2ban Jails',
          action: () => {
            setShowSecurityCenterModal(true);
            fetchFail2banStatus();
            fetchScanHistory();
            if (sites.length > 0 && !scanningDomain) {
              setScanningDomain(sites[0].domain);
            }
          },
          icon: (
            <svg className="w-8 h-8 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          )
        }
      ]
    },
    {
      id: 'software',
      name: 'Software',
      items: [
        {
          name: 'MultiPHP Manager',
          desc: 'Manage PHP version allocations for specific sites',
          action: () => setShowPHPManagerModal(true),
          icon: (
            <svg className="w-8 h-8 text-[#ff6c2c]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
            </svg>
          )
        },
        {
          name: 'WordPress Manager',
          desc: '1-Click fresh WordPress deployer',
          action: () => {
            setInstallApp('wordpress');
            setInstallStatus('');
            setInstallerMode('install');
            setShowInstallModal(true);
          },
          icon: (
            <svg className="w-8 h-8 text-[#0073aa]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3" />
            </svg>
          )
        },
        {
          name: '1-Click Templates',
          desc: 'Deploy pre-packaged professional layouts (Business & Store) in seconds',
          action: () => {
            setTemplateInstallDomain('');
            setTemplateInstallStatus('');
            setTemplateInstallType('ecommerce');
            setShowTemplateModal(true);
          },
          icon: (
            <svg className="w-8 h-8 text-[#e11d48]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          )
        },
        {
          name: 'Laravel Deployer',
          desc: '1-Click Laravel Composer skeleton installer',
          action: () => {
            setInstallApp('laravel');
            setInstallStatus('');
            setInstallerMode('install');
            setShowInstallModal(true);
          },
          icon: (
            <svg className="w-8 h-8 text-[#ff2d20]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 9.75L16.5 12l-2.25 2.25m-4.5 0L7.5 12l2.25-2.25M6 20.25h12a2.25 2.25 0 002.25-2.25V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
            </svg>
          )
        },
        {
          name: 'Website Builder',
          desc: 'Drag-and-Drop visual layout editor and site publisher',
          action: () => {
            setShowWebBuilderModal(true);
            if (sites.length > 0 && !webBuilderDomain) {
              setWebBuilderDomain(sites[0].domain);
              initWebBuilder(sites[0].domain);
            } else if (webBuilderDomain) {
              initWebBuilder(webBuilderDomain);
            }
          },
          icon: (
            <svg className="w-8 h-8 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25A2.25 2.25 0 0113.5 8.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
            </svg>
          )
        }
      ]
    },
    {
      id: 'services',
      name: 'System Services',
      items: [
        {
          name: 'Service Manager',
          desc: 'Monitor Nginx, MySQL, FPM status and edit configuration files',
          action: () => setShowServiceManagerModal(true),
          icon: (
            <svg className="w-8 h-8 text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          )
        }
      ]
    },
    {
      id: 'advanced',
      name: 'Advanced',
      items: [
        {
          name: 'Terminal',
          desc: 'Embedded web console for running shell commands',
          action: () => setShowTerminalModal(true),
          icon: (
            <svg className="w-8 h-8 text-lime-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z" />
            </svg>
          )
        },
        {
          name: 'Cron Jobs',
          desc: 'Schedule recurring commands and tasks',
          action: () => { setShowCronModal(true); fetchCronJobs(); },
          icon: (
            <svg className="w-8 h-8 text-fuchsia-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )
        }
      ]
    }
  ];

  // Perform search filtering on categories and items
  const filteredCategories = categories.map(cat => {
    const matchedItems = cat.items.filter(item => 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.desc.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return { ...cat, items: matchedItems };
  }).filter(cat => cat.items.length > 0);

  return (
    <div className="min-h-screen bg-[#f3f4f6] text-slate-800 font-sans flex selection:bg-orange-500 selection:text-white">
      
      {/* cPanel Left Sidebar */}
      <aside className="w-64 bg-[#0a1829] text-slate-300 flex-shrink-0 flex flex-col min-h-screen border-r border-slate-900">
        
        {/* cPanel Brand Header */}
        <div className="text-xl font-bold tracking-tight text-white italic px-6 py-5 bg-[#081120] border-b border-slate-900/60 flex items-center space-x-1.5">
          <span className="text-orange-500 font-black">ae</span>
          <span>Panel</span>
          <span className="text-[10px] text-slate-500 not-italic font-semibold tracking-normal uppercase ml-2 bg-slate-950 px-1 py-0.5 rounded">v2.0</span>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 px-4 py-6 space-y-1.5">
          <button
            onClick={() => setActiveSidebarItem('tools')}
            className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${
              activeSidebarItem === 'tools' ? 'bg-orange-600 text-white shadow-md' : 'hover:bg-slate-800/50 text-slate-400 hover:text-slate-200'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            <span>Tools</span>
          </button>
          
          <button
            onClick={() => {
              setInstallApp('wordpress');
              setInstallStatus('');
              setInstallerMode('install');
              setShowInstallModal(true);
            }}
            className="w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-colors"
          >
            <span className="w-4 h-4 text-xs font-bold text-center rounded bg-sky-900/40 text-sky-400">WP</span>
            <span>WordPress Deployer</span>
          </button>

          <button
            onClick={() => setShowDomainsManagerModal(true)}
            className="w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9-9c1.657 0 3 4.03 3 9s-1.343 9-3 9m0-18c-1.657 0-3 4.03-3 9s1.343 9 3 9m-9-9a9 9 0 019-9" /></svg>
            <span>Domains Listing</span>
          </button>
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 bg-[#081120] border-t border-slate-900 flex items-center justify-between text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
          <span>Licensing: Free</span>
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
        </div>
      </aside>

      {/* Main Container Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-30 px-8 flex items-center justify-between shadow-sm">
          
          <div className="flex items-center space-x-3">
            <span className="text-sm font-bold text-slate-600 uppercase tracking-wider">Jupiter Theme GUI</span>
          </div>

          {/* Search bar & profile */}
          <div className="flex items-center space-x-6">
            <div className="relative w-72">
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search Tools (/)"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white transition-all shadow-inner"
              />
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-slate-400 absolute left-3 top-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>

            <div className="h-6 w-[1px] bg-slate-200" />

            <div className="flex items-center space-x-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Logged in: root</span>
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 rounded-lg border border-slate-200 hover:border-rose-400 hover:text-rose-600 text-xs font-semibold text-slate-500 transition bg-slate-50"
              >
                Sign Out
              </button>
            </div>
          </div>
        </header>

        {/* Page Content layout */}
        <div className="flex-1 p-8 overflow-y-auto flex lg:flex-row flex-col gap-8">
          
          {/* Main Content Column A (Tools) */}
          <main className="flex-1 min-w-0 space-y-6">
            


            {/* Sitejet banner */}
            <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm flex items-center justify-between">
              <div className="space-y-1.5">
                <h2 className="text-base font-black text-slate-800 tracking-tight flex items-center space-x-2">
                  <span className="w-5 h-5 rounded bg-orange-100 text-orange-600 flex items-center justify-center text-xs">🚀</span>
                  <span>Deploy WordPress & Laravel Instantly</span>
                </h2>
                <p className="text-xs text-slate-500 font-medium">Use our Softaculous-like 1-Click App Installer to launch fresh website configurations in seconds.</p>
              </div>
              <button 
                onClick={() => {
                  setInstallApp('wordpress');
                  setInstallStatus('');
                  setInstallerMode('install');
                  setShowInstallModal(true);
                }}
                className="px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs shadow transition-all flex items-center space-x-1.5"
              >
                <span>Deploy WP</span>
              </button>
            </div>

            {/* Categories & Items Grid */}
            <div className="space-y-6">
              {filteredCategories.map(cat => {
                const isCollapsed = !!collapsedCategories[cat.id];
                return (
                  <section key={cat.id} className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                    
                    {/* Category Header */}
                    <div 
                      onClick={() => toggleCategoryCollapse(cat.id)}
                      className="bg-slate-50 border-b border-slate-200 px-5 py-2.5 flex justify-between items-center cursor-pointer select-none hover:bg-slate-100 transition-colors"
                    >
                      <h3 className="text-[11px] font-extrabold text-slate-600 uppercase tracking-widest">{cat.name}</h3>
                      <span className="text-[10px] text-slate-400 font-bold transition-transform duration-200" style={{ transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}>
                        ▼
                      </span>
                    </div>

                    {/* Icon Grid */}
                    {!isCollapsed && (
                      <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {cat.items.map(item => (
                          <div
                            key={item.name}
                            onClick={item.action}
                            className="flex flex-col items-center justify-center p-4 rounded-xl border border-transparent hover:border-slate-200 hover:bg-slate-50 transition cursor-pointer text-center group"
                          >
                            <div className="p-3 rounded-lg bg-slate-50 group-hover:bg-white border border-slate-100 group-hover:border-slate-200 transition mb-3">
                              {item.icon}
                            </div>
                            <h4 className="text-xs font-bold text-slate-700 tracking-tight">{item.name}</h4>
                            <p className="text-[10px] text-slate-400 font-medium mt-1 leading-normal max-w-[140px] group-hover:text-slate-500 transition">{item.desc}</p>
                          </div>
                        ))}
                      </div>
                    )}

                  </section>
                );
              })}

              {filteredCategories.length === 0 && (
                <div className="bg-white border border-slate-200 rounded-lg p-12 text-center text-slate-400 shadow-sm">
                  <p className="text-sm font-semibold">No tools found matching your query "{searchQuery}"</p>
                  <p className="text-xs text-slate-500 mt-1">Try searching for other hosting categories (e.g. database, backup, nginx, version)</p>
                </div>
              )}
            </div>

          </main>

          {/* Right Statistics & Info Sidebar Column B */}
          <aside className="w-80 flex-shrink-0 space-y-6">
            
            {/* General Info Card */}
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
              <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5">
                <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-wider">General Information</h4>
              </div>
              <div className="p-4 space-y-3 text-xs font-medium text-slate-600">
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Current User</span>
                  <span className="font-bold text-slate-800">root</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Primary Domain</span>
                  <span className="font-bold text-slate-800 truncate max-w-[150px]" title="aetherpanel.duckdns.org">aetherpanel.duckdns.org</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Shared IP Address</span>
                  <span className="font-bold text-slate-800">125.62.80.157</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Home Directory</span>
                  <span className="font-mono text-[10px] text-slate-800">/var/www/vhosts</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Last Login IP</span>
                  <span className="font-bold text-slate-800">103.212.135.140</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Theme</span>
                  <span className="font-bold text-slate-800">jupiter</span>
                </div>
              </div>
            </div>

            {/* Statistics Card */}
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
              <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5">
                <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-wider">System Statistics</h4>
              </div>
              <div className="p-4 space-y-4 text-xs font-medium text-slate-600">
                
                {/* Active Websites */}
                <div>
                  <div className="flex justify-between mb-1.5">
                    <span className="text-slate-500 font-semibold">Active Websites</span>
                    <span className="font-bold text-slate-800">{sites.length} / ∞</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200">
                    <div className="bg-sky-500 h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(sites.length * 20, 100)}%` }} />
                  </div>
                </div>

                {/* MySQL Databases */}
                <div>
                  <div className="flex justify-between mb-1.5">
                    <span className="text-slate-500 font-semibold">MySQL Databases</span>
                    <span className="font-bold text-slate-800">{databases.length} / ∞</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200">
                    <div className="bg-teal-500 h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(databases.length * 20, 100)}%` }} />
                  </div>
                </div>

                {/* CPU Usage */}
                <div>
                  <div className="flex justify-between mb-1.5">
                    <span className="text-slate-500 font-semibold">CPU Usage</span>
                    <span className="font-bold text-slate-800">{metrics.cpuUsage}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200">
                    <div className="bg-orange-500 h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(metrics.cpuUsage, 100)}%` }} />
                  </div>
                </div>

                {/* RAM Usage */}
                <div>
                  <div className="flex justify-between mb-1.5">
                    <span className="text-slate-500 font-semibold">RAM Usage</span>
                    <span className="font-bold text-slate-800">{metrics.ramUsage}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200">
                    <div className="bg-indigo-500 h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(metrics.ramUsage, 100)}%` }} />
                  </div>
                </div>

                {/* Disk Usage */}
                <div>
                  <div className="flex justify-between mb-1.5">
                    <span className="text-slate-500 font-semibold">Disk Usage (NVMe)</span>
                    <span className="font-bold text-slate-800">{metrics.diskUsage}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200">
                    <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(metrics.diskUsage, 100)}%` }} />
                  </div>
                </div>

              </div>
            </div>

          </aside>

        </div>

      </div>

      {/* =================================================================== */}
      {/* cPanel MODAL POPUPS INTEGRATION                                      */}
      {/* =================================================================== */}

      {/* Global Domain & SSL Manager Modal */}
      {showDomainsManagerModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-6">
          <div className="bg-white border border-slate-200 rounded-xl max-w-4xl w-full p-8 shadow-2xl relative flex flex-col max-h-[85vh]">
            <button onClick={() => setShowDomainsManagerModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-700 text-sm font-bold">X</button>
            <h2 className="text-lg font-black text-slate-800 mb-1">Domains Directory Listing</h2>
            <p className="text-xs text-slate-500 mb-6 font-medium">Add, delete, hot-swap PHP and manage Certbot SSL certificates for your Nginx virtual hosts.</p>
            
            <div className="flex justify-end mb-4">
              <button
                onClick={() => { setShowAddSiteModal(true); setShowDomainsManagerModal(false); }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg shadow transition"
              >
                + Add New Website
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4">
              {sites.map(site => (
                <div key={site.domain} className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-600 font-medium">
                  <div>
                    <div className="flex items-center space-x-3">
                      <span className="font-bold text-slate-800 text-sm">{site.domain}</span>
                      <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full uppercase tracking-wider ${
                        site.sslActive ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-rose-100 text-rose-700 border border-rose-200'
                      }`}>
                        {site.sslActive ? 'SSL Active' : 'No SSL'}
                      </span>
                    </div>
                    <p className="text-slate-400 text-[10px] mt-1">PHP Pool: <code className="bg-slate-200 px-1 rounded text-slate-700">PHP {site.phpVersion}</code> | Root: <code className="bg-slate-200 px-1 rounded text-slate-700">/var/www/vhosts/{site.domain}/public</code></p>
                  </div>

                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => handleProvisionSSL(site.domain)}
                      disabled={site.sslActive}
                      className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 disabled:bg-slate-200 disabled:text-slate-400 text-white text-[10px] font-bold rounded-lg transition"
                    >
                      {site.sslActive ? 'SSL Active' : 'Install SSL'}
                    </button>
                    <select
                      value={site.phpVersion}
                      onChange={e => handleUpdatePHP(site.domain, e.target.value)}
                      className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-[11px] focus:outline-none"
                    >
                      {['7.4', '8.1', '8.2', '8.3', '8.4'].map(v => (
                        <option key={v} value={v}>PHP {v}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => handleDeleteSite(site.domain)}
                      className="p-1.5 text-rose-500 hover:bg-rose-50 hover:text-rose-700 rounded-lg border border-transparent hover:border-rose-200 transition"
                      title="Delete Virtual Host"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>
              ))}
              {sites.length === 0 && (
                <div className="text-center py-10 text-slate-400">No websites deployed. Click "Add New Website" to get started.</div>
              )}
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-200 mt-4">
              <button onClick={() => setShowDomainsManagerModal(false)} className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-xs rounded-lg transition">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Global MySQL DB Manager Modal */}
      {showDBManagerModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-6">
          <div className="bg-white border border-slate-200 rounded-xl max-w-2xl w-full p-8 shadow-2xl relative flex flex-col max-h-[85vh]">
            <button onClick={() => setShowDBManagerModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-700 text-sm font-bold">X</button>
            <h2 className="text-lg font-black text-slate-800 mb-1">MySQL Databases listing & wizard</h2>
            <p className="text-xs text-slate-500 mb-6 font-medium">Create and drop databases and assign full root user privileges automatically.</p>

            <button
              onClick={() => { setShowCreateDBModal(true); setShowDBManagerModal(false); }}
              className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold shadow transition mb-6"
            >
              + Create New Database & User
            </button>

            <div className="flex-1 overflow-y-auto space-y-2.5">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Active Databases</span>
              {databases.map(db => (
                <div key={db} className="flex justify-between items-center bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl text-xs text-slate-600 font-medium">
                  <span className="font-mono text-slate-800 text-sm">{db}</span>
                  <button
                    onClick={() => handleDeleteDB(db)}
                    title="Drop Database"
                    className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              ))}
              {databases.length === 0 && (
                <p className="text-center py-6 text-slate-400">No MySQL databases created yet.</p>
              )}
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-200 mt-4">
              <button onClick={() => setShowDBManagerModal(false)} className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-xs rounded-lg transition">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Global UFW Firewall Modal */}
      {showFWManagerModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-6">
          <div className="bg-white border border-slate-200 rounded-xl max-w-2xl w-full p-8 shadow-2xl relative flex flex-col max-h-[85vh]">
            <button onClick={() => setShowFWManagerModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-700 text-sm font-bold">X</button>
            <h2 className="text-lg font-black text-slate-800 mb-1">Firewall Settings (UFW)</h2>
            <p className="text-xs text-slate-500 mb-6 font-medium">Allow or deny incoming ports on your VPS.</p>

            <div className="flex space-x-2 mb-6">
              <input
                type="text"
                value={fwPort}
                onChange={(e) => setFwPort(e.target.value)}
                placeholder="Port (e.g. 8080)"
                className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-orange-500"
              />
              <select
                value={fwAction}
                onChange={(e) => setFwAction(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none"
              >
                <option value="allow">Allow</option>
                <option value="deny">Deny</option>
              </select>
              <button
                onClick={handleApplyFW}
                disabled={applyingFW || !fwPort}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-500 disabled:bg-slate-200 text-white rounded-lg text-xs font-bold transition shadow"
              >
                {applyingFW ? '...' : 'Apply Rule'}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Active Firewall Rules</span>
              {firewallRules.rules && firewallRules.rules.length > 0 ? (
                firewallRules.rules.map((rule, i) => (
                  <div key={i} className="text-xs font-mono text-slate-600 bg-slate-50 border border-slate-200 px-4 py-2 rounded-lg">{rule}</div>
                ))
              ) : (
                <p className="text-center py-6 text-slate-400">No active UFW rules. Status: {firewallRules.status}</p>
              )}
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-200 mt-4">
              <button onClick={() => setShowFWManagerModal(false)} className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-xs rounded-lg transition">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Global PHP Version Select Modal */}
      {showPHPManagerModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-6">
          <div className="bg-white border border-slate-200 rounded-xl max-w-2xl w-full p-8 shadow-2xl relative flex flex-col max-h-[85vh]">
            <button onClick={() => setShowPHPManagerModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-700 text-sm font-bold">X</button>
            <h2 className="text-lg font-black text-slate-800 mb-1">MultiPHP Manager</h2>
            <p className="text-xs text-slate-500 mb-6 font-medium">Select and hot-swap PHP-FPM execution versions for active virtual host directories.</p>

            <div className="flex-1 overflow-y-auto space-y-4">
              {sites.map(site => (
                <div key={site.domain} className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs text-slate-600 font-medium">
                  <div>
                    <span className="font-bold text-slate-800 text-sm block">{site.domain}</span>
                    <span className="text-[10px] text-slate-400">Current version: PHP {site.phpVersion}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        setIniDomain(site.domain);
                        fetchPHPSettings(site.domain);
                        setShowIniModal(true);
                        setShowPHPManagerModal(false);
                      }}
                      className="px-2 py-1 bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-700 rounded text-[10px] font-bold transition flex items-center space-x-1"
                      title="Edit PHP.ini limits"
                    >
                      <span>⚙️ Edit INI</span>
                    </button>
                    <select
                      value={site.phpVersion}
                      onChange={e => handleUpdatePHP(site.domain, e.target.value)}
                      className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-semibold focus:outline-none"
                    >
                      {['7.4', '8.1', '8.2', '8.3', '8.4'].map(v => (
                        <option key={v} value={v}>PHP {v}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
              {sites.length === 0 && (
                <p className="text-center py-10 text-slate-400">No websites deployed. Please add a website first.</p>
              )}
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-200 mt-4">
              <button onClick={() => setShowPHPManagerModal(false)} className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-xs rounded-lg transition">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Global System Services Manager Modal */}
      {showServiceManagerModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-6">
          <div className="bg-white border border-slate-200 rounded-xl max-w-3xl w-full p-8 shadow-2xl relative flex flex-col max-h-[85vh]">
            <button onClick={() => setShowServiceManagerModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-700 text-sm font-bold">X</button>
            <h2 className="text-lg font-black text-slate-800 mb-1">Service Manager Status Controls</h2>
            <p className="text-xs text-slate-500 mb-6 font-medium">Monitor running states, trigger restarts and edit Nginx/PHP configs directly.</p>

            <div className="flex-1 overflow-y-auto space-y-3">
              {services.map(svc => (
                <div key={svc.name} className="flex items-center justify-between bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl text-xs text-slate-600 font-medium">
                  <span className="font-mono text-slate-800 font-bold text-sm">{svc.name}</span>
                  
                  <div className="flex items-center space-x-3">
                    <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${
                      svc.active ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-rose-100 text-rose-700 border border-rose-200'
                    }`}>
                      {svc.active ? 'Running' : 'Stopped'}
                    </span>
                    
                    <button
                      onClick={() => handleServiceControl(svc.name, svc.active ? 'stop' : 'start')}
                      className="p-1.5 rounded-lg border border-slate-200 hover:border-slate-300 bg-white transition"
                      title={svc.active ? 'Stop service' : 'Start service'}
                    >
                      {svc.active ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-slate-500" viewBox="0 0 20 20" fill="currentColor"><rect x="5" y="5" width="10" height="10" rx="1" /></svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-slate-500" viewBox="0 0 20 20" fill="currentColor"><path d="M4.5 3.5v13L16 10l-11.5-6.5z" /></svg>
                      )}
                    </button>

                    <button
                      onClick={() => handleServiceControl(svc.name, 'restart')}
                      className="p-1.5 rounded-lg border border-slate-200 hover:border-slate-300 bg-white transition"
                      title="Restart service"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    </button>

                    {(svc.name === 'nginx' || svc.name.startsWith('php')) && (
                      <button
                        onClick={() => {
                          const serviceKey = svc.name.endsWith('-fpm') ? svc.name.slice(0, -4) : svc.name;
                          handleOpenConfig(serviceKey);
                          setShowServiceManagerModal(false);
                        }}
                        className="p-1.5 rounded-lg border border-slate-200 hover:border-orange-200 hover:bg-orange-50 bg-white transition"
                        title="Edit Configuration"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-slate-500 hover:text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.43l-1.003.828c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.43l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.991l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-200 mt-4">
              <button onClick={() => setShowServiceManagerModal(false)} className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-xs rounded-lg transition">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* global File Manager Selector Modal */}
      {showFileManagerSelector && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-6">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-8 shadow-2xl relative">
            <button onClick={() => setShowFileManagerSelector(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-700 text-sm font-bold">X</button>
            <h2 className="text-lg font-black text-slate-800 mb-1">Open File Manager</h2>
            <p className="text-xs text-slate-500 mb-6 font-medium">Select a virtual host website directory to explore and edit files.</p>
            
            <div className="space-y-4">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1 font-semibold uppercase tracking-wider">Select Domain</label>
                <select
                  value={selectedFileManagerDomain}
                  onChange={e => setSelectedFileManagerDomain(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:border-orange-500"
                >
                  <option value="">-- Choose Website --</option>
                  {sites.map(s => (
                    <option key={s.domain} value={s.domain}>{s.domain}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
                <button
                  onClick={() => setShowFileManagerSelector(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  disabled={!selectedFileManagerDomain}
                  onClick={async () => {
                    setFmDomain(selectedFileManagerDomain);
                    setFmPath('');
                    setShowFileManagerSelector(false);
                    await fetchFmFiles(selectedFileManagerDomain, '');
                  }}
                  className="px-5 py-2 bg-orange-600 hover:bg-orange-500 disabled:bg-slate-200 text-white rounded-lg text-xs font-bold shadow transition"
                >
                  Explore Directory
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Global File Manager Modal */}
      {fmDomain && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[50] p-6">
          <div className="bg-white border border-slate-200 rounded-xl max-w-5xl w-full p-8 shadow-2xl relative flex flex-col h-[85vh] animate-fadeIn">
            <button
              onClick={() => {
                if (!fmSaving) {
                  setFmDomain('');
                  setFmFiles([]);
                  setFmPath('');
                }
              }}
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-700 text-sm font-bold"
            >
              X
            </button>
            <h2 className="text-lg font-black text-slate-800 mb-1">File Manager: <code className="text-sm font-mono text-orange-600 bg-orange-50 px-2 py-0.5 rounded">{fmDomain}</code></h2>
            <p className="text-xs text-slate-500 mb-6 font-medium">Browse files, configure permissions, and edit code configurations directly on the server.</p>

            {/* Path indicator and back button */}
            <div className="flex items-center justify-between text-xs text-slate-600 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200 mb-4 font-mono">
              <span>Current Path: <code className="text-orange-600 font-bold">/var/www/vhosts/{fmDomain}/public/{fmPath}</code></span>
              {fmPath && (
                <button
                  onClick={() => {
                    const parts = fmPath.split('/');
                    parts.pop();
                    const newPath = parts.join('/');
                    setFmPath(newPath);
                    fetchFmFiles(fmDomain, newPath);
                  }}
                  className="px-3 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 font-bold text-[10px] uppercase shadow-sm transition"
                >
                  .. Back Directory
                </button>
              )}
            </div>

            {/* File List Table */}
            <div className="flex-1 overflow-y-auto border border-slate-200 rounded-xl overflow-hidden shadow-inner bg-slate-50">
              {fmLoading ? (
                <div className="py-20 text-center text-slate-400 text-xs font-semibold flex flex-col items-center justify-center space-y-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-orange-500 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                  <span>Loading files directory...</span>
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-100 text-slate-500 font-extrabold uppercase tracking-wider text-[10px]">
                      <th className="p-3">File / Folder Name</th>
                      <th className="p-3">Permissions</th>
                      <th className="p-3">Size</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-600 font-mono text-[11px] divide-y divide-slate-100">
                    {fmFiles.map((file) => (
                      <tr key={file.name} className="hover:bg-white transition bg-slate-50/50">
                        <td className={`p-3 flex items-center space-x-2 font-semibold ${file.isDir ? 'text-orange-600' : 'text-slate-700'}`}>
                          {file.isDir ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                          )}
                          <span>{file.name}</span>
                        </td>
                        <td className="p-3 text-slate-400">{file.perm || '-'}</td>
                        <td className="p-3 text-slate-400">{file.isDir ? '-' : `${(file.size / 1024).toFixed(1)} KB`}</td>
                        <td className="p-3 text-right space-x-2">
                          {file.isDir ? (
                            <button
                              onClick={() => {
                                const nextPath = fmPath ? `${fmPath}/${file.name}` : file.name;
                                setFmPath(nextPath);
                                fetchFmFiles(fmDomain, nextPath);
                              }}
                              className="text-orange-600 hover:underline font-bold"
                            >
                              Explore
                            </button>
                          ) : (
                            <button
                              onClick={() => handleFmEditFile(file.name)}
                              className="text-orange-600 hover:underline font-bold"
                            >
                              Edit Code
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {fmFiles.length === 0 && (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-slate-400 font-semibold">Empty website public directory</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-200 mt-4">
              <button
                onClick={() => {
                  setFmDomain('');
                  setFmFiles([]);
                  setFmPath('');
                }}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-xs rounded-lg transition"
              >
                Close Manager
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global File Editor Textarea Popup */}
      {fmSelectedFile && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[60] p-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-4xl w-full p-6 shadow-2xl relative flex flex-col h-[80vh] animate-fadeIn">
            <h3 className="text-xs font-bold text-slate-400 mb-2 font-mono uppercase tracking-wider">Editing: {fmSelectedFile}</h3>
            <textarea
              value={fmFileContent}
              onChange={e => setFmFileContent(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-lg p-4 font-mono text-xs text-slate-300 focus:outline-none focus:border-indigo-500 resize-none h-full whitespace-pre overflow-auto"
            />
            <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800 mt-4">
              <button
                onClick={() => { setFmSelectedFile(null); setFmFileContent(''); }}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleFmSaveFile}
                disabled={fmSaving}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white rounded-lg text-xs font-semibold transition"
              >
                {fmSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Website Modal */}
      {showAddSiteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-6">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-8 shadow-2xl relative">
            <button onClick={() => setShowAddSiteModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-700 text-sm font-bold">X</button>
            <h2 className="text-xl font-bold text-slate-800 mb-1.5">Add New Website</h2>
            <p className="text-xs text-slate-500 mb-6">Provision a new Nginx virtual host with isolated PHP-FPM pool and web root directory.</p>
            <form onSubmit={handleAddSite} className="space-y-4">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1 font-semibold uppercase tracking-wider">Domain Name</label>
                <input required type="text" value={newSiteDomain} onChange={e => setNewSiteDomain(e.target.value)} placeholder="example.com" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-orange-500" />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1 font-semibold uppercase tracking-wider">PHP Version</label>
                <select value={newSitePHP} onChange={e => setNewSitePHP(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none">
                  <option value="7.4">PHP 7.4 (Legacy)</option>
                  <option value="8.1">PHP 8.1</option>
                  <option value="8.2">PHP 8.2</option>
                  <option value="8.3">PHP 8.3</option>
                  <option value="8.4">PHP 8.4 (Latest)</option>
                </select>
              </div>
              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
                <button type="button" onClick={() => setShowAddSiteModal(false)} className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800">Cancel</button>
                <button type="submit" disabled={addingSite} className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-200 text-white rounded-lg text-xs font-bold shadow transition">
                  {addingSite ? 'Creating...' : 'Create Website'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Database Modal */}
      {showCreateDBModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-6">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-8 shadow-2xl relative">
            <button onClick={() => setShowCreateDBModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-700 text-sm font-bold">X</button>
            <h2 className="text-xl font-bold text-slate-800 mb-1.5">Create MySQL Database</h2>
            <p className="text-xs text-slate-500 mb-6">Provision a new database with dedicated user and privileges.</p>
            <form onSubmit={handleCreateDB} className="space-y-4">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1 font-semibold uppercase tracking-wider">Database Name</label>
                <input required type="text" value={newDBName} onChange={e => setNewDBName(e.target.value)} placeholder="my_database" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-orange-500" />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1 font-semibold uppercase tracking-wider">Database User</label>
                <input required type="text" value={newDBUser} onChange={e => setNewDBUser(e.target.value)} placeholder="db_user" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-orange-500" />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1 font-semibold uppercase tracking-wider">Password (leave blank for auto-generated)</label>
                <input type="password" value={newDBPass} onChange={e => setNewDBPass(e.target.value)} placeholder="Auto-generated if empty" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-orange-500" />
              </div>

              {dbResult && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 space-y-1 text-xs text-emerald-800">
                  <p className="font-bold">Database Created Successfully!</p>
                  <p className="font-mono">DB: {dbResult.dbName}</p>
                  <p className="font-mono">User: {dbResult.dbUser}</p>
                  <p className="font-mono">Pass: {dbResult.dbPass}</p>
                  <p className="font-mono">Host: localhost</p>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
                <button type="button" onClick={() => setShowCreateDBModal(false)} className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800">Close</button>
                <button type="submit" disabled={creatingDB} className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-200 text-white rounded-lg text-xs font-bold shadow transition">
                  {creatingDB ? 'Creating...' : 'Create Database'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Migration Wizard Modal */}
      {showMigrationModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-6 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-xl max-w-2xl w-full p-8 shadow-2xl relative">
            <button onClick={() => setShowMigrationModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-700 text-sm font-bold">X</button>

            <h2 className="text-xl font-bold text-slate-800 mb-1.5">Site Migration Wizard</h2>
            <p className="text-xs text-slate-500 mb-6">Enter source server credentials. Aether Panel will scan systems, copy files, migrate databases, and reconfigure automatically.</p>

            <form onSubmit={handleMigrationSubmit} className="space-y-6">
              <div className="border border-slate-200 p-4 rounded-xl space-y-4">
                <h4 className="text-[10px] font-bold text-orange-600 uppercase tracking-wider">Source Server Details</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <label className="text-[10px] text-slate-400 block mb-1 font-semibold">Remote Host / IP</label>
                    <input required type="text" value={migrationForm.remoteHost} onChange={e => setMigrationForm({...migrationForm, remoteHost: e.target.value})} placeholder="e.g. 192.168.1.100" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-orange-500" />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1 font-semibold">SSH Port</label>
                    <input required type="number" value={migrationForm.remotePort} onChange={e => setMigrationForm({...migrationForm, remotePort: parseInt(e.target.value)})} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1 font-semibold">Username</label>
                    <input required type="text" value={migrationForm.remoteUser} onChange={e => setMigrationForm({...migrationForm, remoteUser: e.target.value})} placeholder="root" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none" />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1 font-semibold">Password</label>
                    <input type="password" value={migrationForm.remotePass} onChange={e => setMigrationForm({...migrationForm, remotePass: e.target.value})} placeholder="Password" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none" />
                  </div>
                </div>
              </div>

              {migrationStatus && (
                <div className="text-xs font-semibold text-orange-600 bg-orange-50 border border-orange-200 p-3 rounded-lg flex items-center space-x-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                  <span>{migrationStatus}</span>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
                <button type="button" onClick={() => setShowMigrationModal(false)} className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800">Cancel</button>
                <button type="submit" disabled={migrating} className="px-5 py-2 bg-orange-600 hover:bg-orange-500 disabled:bg-slate-200 text-white rounded-lg text-xs font-bold shadow transition">
                  {migrating ? 'Migrating...' : 'Start Migration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 1-Click App Installer Modal */}
      {showInstallModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-6">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-8 shadow-2xl relative animate-fadeIn">
            <button onClick={() => { if (!installing) setShowInstallModal(false); }} className="absolute top-6 right-6 text-slate-400 hover:text-slate-700 text-sm font-bold">X</button>
            <h2 className="text-xl font-bold text-slate-800 mb-1.5 capitalize">{installerMode} {installApp}</h2>
            <p className="text-xs text-slate-500 mb-4 font-medium">
              {installerMode === 'install' 
                ? `Install a fresh instance of ${installApp} with database and configuration pre-configured.`
                : `Wipe all files, databases and configurations associated with ${installApp} on this domain.`}
            </p>

            {/* Mode selection tabs */}
            <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 mb-4">
              <button
                type="button"
                disabled={installing}
                onClick={() => setInstallerMode('install')}
                className={`flex-1 py-1 text-[10px] font-black rounded-md uppercase tracking-wider transition ${installerMode === 'install' ? 'bg-orange-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Install Application
              </button>
              <button
                type="button"
                disabled={installing}
                onClick={() => setInstallerMode('uninstall')}
                className={`flex-1 py-1 text-[10px] font-black rounded-md uppercase tracking-wider transition ${installerMode === 'uninstall' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Uninstall Application
              </button>
            </div>

            <form onSubmit={handleInstallSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1 font-semibold uppercase tracking-wider">Select Target Website</label>
                <select 
                  required 
                  value={installDomain} 
                  onChange={e => setInstallDomain(e.target.value)} 
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none"
                  disabled={installing}
                >
                  <option value="">-- Choose site --</option>
                  {sites.map(s => (
                    <option key={s.domain} value={s.domain}>{s.domain}</option>
                  ))}
                </select>
              </div>

              {installStatus && (
                <div className={`text-xs font-semibold p-3 rounded-lg flex items-center space-x-2 ${
                  installStatus.startsWith('Success') 
                    ? 'text-emerald-700 bg-emerald-50 border border-emerald-200' 
                    : installStatus.startsWith('Failed') 
                      ? 'text-rose-700 bg-rose-50 border border-rose-200' 
                      : 'text-orange-700 bg-orange-50 border border-orange-200'
                }`}>
                  {!installStatus.startsWith('Success') && !installStatus.startsWith('Failed') && (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                  )}
                  <span>{installStatus}</span>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
                <button 
                  type="button" 
                  onClick={() => setShowInstallModal(false)} 
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800"
                  disabled={installing}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={installing || !installDomain} 
                  className={`px-5 py-2 disabled:bg-slate-200 text-white rounded-lg text-xs font-bold shadow transition ${installerMode === 'install' ? 'bg-orange-600 hover:bg-orange-500' : 'bg-rose-600 hover:bg-rose-500'}`}
                >
                  {installing ? (installerMode === 'install' ? 'Installing...' : 'Uninstalling...') : (installerMode === 'install' ? 'Start Installation' : 'Uninstall Application')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Service Configuration Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-3xl w-full p-8 shadow-2xl relative flex flex-col h-[80vh] animate-fadeIn">
            <button onClick={() => { if (!savingConfig) setShowConfigModal(false); }} className="absolute top-6 right-6 text-slate-500 hover:text-slate-200 text-sm font-bold">X</button>
            <h2 className="text-xl font-bold text-slate-100 mb-1.5 capitalize">Configure {configService}</h2>
            <p className="text-xs text-slate-500 mb-6 font-medium">
              {configService === 'nginx' 
                ? 'Edit the global Nginx server configuration (nginx.conf).' 
                : `Edit the php.ini configuration file for ${configService}.`}
            </p>

            {loadingConfig ? (
              <div className="py-20 text-center text-slate-500 text-xs font-semibold flex flex-col items-center justify-center space-y-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-indigo-500 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                <span>Loading configuration...</span>
              </div>
            ) : (
              <form onSubmit={handleSaveConfig} className="flex-1 flex flex-col h-full space-y-4">
                <div className="flex-1 min-h-0">
                  <textarea
                    required
                    value={configContent}
                    onChange={e => setConfigContent(e.target.value)}
                    className="w-full h-full bg-slate-950 border border-slate-800 rounded-lg p-4 font-mono text-xs text-slate-300 focus:outline-none focus:border-indigo-500 whitespace-pre overflow-auto resize-none"
                    disabled={savingConfig}
                  />
                </div>

                {configError && (
                  <div className="text-xs font-mono font-semibold p-3 text-rose-400 bg-rose-950/20 border border-rose-900/50 rounded-lg whitespace-pre-wrap max-h-40 overflow-y-auto">
                    {configError}
                  </div>
                )}

                {configSuccess && (
                  <div className="text-xs font-semibold p-3 text-emerald-400 bg-emerald-950/20 border border-emerald-900/50 rounded-lg">
                    {configSuccess}
                  </div>
                )}

                <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
                  <button 
                    type="button" 
                    onClick={() => setShowConfigModal(false)} 
                    className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200"
                    disabled={savingConfig}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={savingConfig} 
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white rounded-lg text-xs font-semibold transition flex items-center space-x-1.5"
                  >
                    {savingConfig && (
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    )}
                    <span>{savingConfig ? 'Testing & Saving...' : 'Save Configuration'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Google Drive / Backups Connected State Modal */}
      {gdriveConnected && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-6">
          <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setGdriveConnected(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-700 text-sm font-bold">X</button>
            <h2 className="text-xl font-bold text-slate-800 mb-1.5">Backup Engine Options</h2>
            <p className="text-xs text-slate-500 mb-6 font-medium">Encrypt and push compressed virtual host directories and SQL dumps directly to offsite Google Drive storage.</p>
            
            {backupConfigLoading ? (
              <p className="text-center text-xs text-slate-500 py-6">Loading configuration...</p>
            ) : (
              <div className="space-y-6">
                {/* Configuration Form */}
                <form onSubmit={handleSaveBackupConfig} className="space-y-4 border-b border-slate-200 pb-6">
                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-slate-700 block">Daily Automated Backup</span>
                      <span className="text-[10px] text-slate-400">Triggers every night at 2:00 AM server time</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setBackupEnabled(!backupEnabled)}
                      className={`w-10 h-5 rounded-full transition-colors relative border ${backupEnabled ? 'bg-orange-600 border-orange-600' : 'bg-slate-200 border-slate-300'}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 bg-white w-3.5 h-3.5 rounded-full transition-transform ${backupEnabled ? 'translate-x-5' : ''}`} />
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Google Drive Folder ID</label>
                    <input
                      required
                      type="text"
                      value={backupFolderId}
                      onChange={e => setBackupFolderId(e.target.value)}
                      placeholder="Folder ID from your Google Drive URL"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                      Service Account JSON Key
                    </label>
                    <textarea
                      value={backupServiceAccountKey}
                      onChange={e => setBackupServiceAccountKey(e.target.value)}
                      placeholder={backupKeyConfigured ? "Service Account Key is configured. Paste new JSON to overwrite." : "Paste contents of your Google Service Account credentials .json file here..."}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-orange-500 h-24 font-mono resize-none"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={backupConfigSaving}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-200 text-white rounded-lg text-xs font-semibold transition"
                    >
                      {backupConfigSaving ? 'Saving Settings...' : 'Save Settings'}
                    </button>
                  </div>
                </form>

                {/* Instant Trigger & Live Status */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-slate-700 block">Backup Status</span>
                      <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">{backupStatus}</span>
                    </div>
                    <button
                      onClick={handleTriggerBackup}
                      disabled={backupRunning}
                      className="px-4 py-2 bg-orange-600 hover:bg-orange-500 disabled:bg-slate-300 text-white rounded-lg text-xs font-semibold transition flex items-center space-x-1.5"
                    >
                      {backupRunning ? (
                        <>
                          <svg className="animate-spin h-3 w-3 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          <span>Backing up...</span>
                        </>
                      ) : (
                        <span>Run Backup Now</span>
                      )}
                    </button>
                  </div>
                </div>

                {/* Backup Log History */}
                <div className="space-y-2">
                  <h4 className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Backup Log History</h4>
                  <div className="border border-slate-200 rounded-lg overflow-hidden max-h-36 overflow-y-auto">
                    {backupLogs.length === 0 ? (
                      <p className="text-center text-xs text-slate-400 py-6 bg-slate-50">No backup records found.</p>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {backupLogs.map((log, index) => (
                          <div key={index} className="p-3 bg-slate-50 flex items-start justify-between text-[11px] font-mono leading-relaxed">
                            <div className="space-y-1 pr-4">
                              <span className="text-slate-400 block text-[9px]">{log.timestamp}</span>
                              <span className="text-slate-600 block">{log.message}</span>
                            </div>
                            <span className={`px-2 py-0.5 text-[9px] rounded font-bold uppercase ${log.status === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                              {log.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-4 border-t border-slate-200 mt-6">
              <button onClick={() => setGdriveConnected(false)} className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-xs rounded-lg transition">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ============ TERMINAL MODAL ============ */}
      {showTerminalModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <div className="bg-[#1a1a2e] border border-slate-700 rounded-xl max-w-3xl w-full shadow-2xl relative flex flex-col" style={{ height: '520px' }}>
            <div className="flex items-center justify-between px-5 py-3 bg-[#16162a] border-b border-slate-700 rounded-t-xl">
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <span className="text-xs font-bold text-slate-400 ml-3">root@aether-vps — bash</span>
              </div>
              <button onClick={() => { setShowTerminalModal(false); setTerminalHistory([]); setTerminalCmd(''); }} className="text-slate-500 hover:text-white text-xs font-bold">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 font-mono text-xs leading-relaxed" id="terminal-output" ref={el => { if (el) el.scrollTop = el.scrollHeight; }}>
              {terminalHistory.length === 0 && (
                <div className="text-slate-500">Aether Panel Web Terminal v1.0 — Type commands below and press Enter.<br/>Working directory: {terminalCwd}</div>
              )}
              {terminalHistory.map((entry, i) => (
                <div key={i} className={entry.type === 'input' ? 'text-lime-400' : entry.type === 'error' ? 'text-red-400' : 'text-slate-300 whitespace-pre-wrap'}>
                  {entry.text}
                </div>
              ))}
              {terminalRunning && <div className="text-yellow-400 animate-pulse">Running...</div>}
            </div>
            <form onSubmit={handleTerminalSubmit} className="flex items-center border-t border-slate-700 bg-[#12122a] rounded-b-xl">
              <span className="text-lime-400 font-mono text-xs pl-4 pr-1 flex-shrink-0">root@aether:{terminalCwd}#</span>
              <input
                type="text"
                value={terminalCmd}
                onChange={e => setTerminalCmd(e.target.value)}
                onKeyDown={handleTerminalKeyDown}
                className="flex-1 bg-transparent text-white font-mono text-xs py-3 px-2 outline-none placeholder:text-slate-600"
                placeholder="Enter command..."
                autoFocus
                disabled={terminalRunning}
              />
            </form>
          </div>
        </div>
      )}

      {/* ============ CRON JOBS MODAL ============ */}
      {showCronModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-6">
          <div className="bg-white border border-slate-200 rounded-xl max-w-2xl w-full p-8 shadow-2xl relative flex flex-col max-h-[85vh]">
            <button onClick={() => setShowCronModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-700 text-sm font-bold">X</button>
            <h2 className="text-lg font-black text-slate-800 mb-1">Cron Jobs Manager</h2>
            <p className="text-xs text-slate-500 mb-6 font-medium">Schedule recurring system commands using standard cron timing syntax.</p>

            <form onSubmit={handleCronSave} className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-6 space-y-3">
              <div>
                <label className="text-[10px] text-slate-500 block font-bold uppercase tracking-wider mb-1">Common Presets</label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: 'Every Minute', val: '* * * * *' },
                    { label: 'Every 5 Min', val: '*/5 * * * *' },
                    { label: 'Every Hour', val: '0 * * * *' },
                    { label: 'Twice Daily', val: '0 */12 * * *' },
                    { label: 'Once Daily', val: '0 0 * * *' },
                    { label: 'Weekly', val: '0 0 * * 0' },
                    { label: 'Monthly', val: '0 0 1 * *' },
                  ].map(p => (
                    <button key={p.val} type="button" onClick={() => setCronTiming(p.val)} className={`px-2 py-1 rounded text-[9px] font-bold border transition ${cronTiming === p.val ? 'bg-orange-600 text-white border-orange-600' : 'bg-white text-slate-600 border-slate-200 hover:border-orange-400'}`}>{p.label}</button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-500 block font-bold uppercase tracking-wider mb-1">Timing (Cron Expression)</label>
                  <input type="text" value={cronTiming} onChange={e => setCronTiming(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-orange-500" placeholder="* * * * *" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 block font-bold uppercase tracking-wider mb-1">Command</label>
                  <input type="text" value={cronCommand} onChange={e => setCronCommand(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-orange-500" placeholder="/usr/bin/php /path/to/script.php" />
                </div>
              </div>
              <div className="flex justify-end">
                <button type="submit" disabled={cronSaving} className="px-4 py-2 bg-orange-600 hover:bg-orange-500 disabled:bg-slate-300 text-white font-bold text-xs rounded-lg shadow transition">
                  {cronSaving ? 'Saving...' : 'Add Cron Job'}
                </button>
              </div>
            </form>

            <div className="flex-1 overflow-y-auto">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">Active Cron Jobs ({cronJobs.length})</h3>
              {cronLoading ? (
                <div className="text-xs text-slate-400 py-4 text-center">Loading crontab...</div>
              ) : cronJobs.length === 0 ? (
                <div className="text-xs text-slate-400 py-4 text-center bg-slate-50 rounded-lg border border-slate-200">No cron jobs configured.</div>
              ) : (
                <div className="space-y-2">
                  {cronJobs.map((job, i) => (
                    <div key={i} className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5">
                      <div className="flex-1 min-w-0">
                        <span className="font-mono text-xs text-orange-600 font-bold">{job.timing}</span>
                        <span className="text-xs text-slate-600 ml-3 truncate">{job.command}</span>
                      </div>
                      <button onClick={() => handleCronDelete(job)} className="ml-3 text-xs text-rose-500 hover:text-rose-700 font-bold flex-shrink-0">Delete</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============ DIRECTORY PRIVACY MODAL ============ */}
      {showPrivacyModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-6">
          <div className="bg-white border border-slate-200 rounded-xl max-w-2xl w-full p-8 shadow-2xl relative flex flex-col max-h-[85vh]">
            <button onClick={() => setShowPrivacyModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-700 text-sm font-bold">X</button>
            <h2 className="text-lg font-black text-slate-800 mb-1">Directory Privacy</h2>
            <p className="text-xs text-slate-500 mb-6 font-medium">Password-protect website directories using Nginx HTTP Basic Authentication.</p>

            <div className="mb-4">
              <label className="text-[10px] text-slate-500 block font-bold uppercase tracking-wider mb-1">Select Website</label>
              <select
                value={privacyDomain}
                onChange={e => { setPrivacyDomain(e.target.value); fetchPrivacyRules(e.target.value); }}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-orange-500"
              >
                <option value="">-- Select Domain --</option>
                {sites.map(s => <option key={s.domain} value={s.domain}>{s.domain}</option>)}
              </select>
            </div>

            {privacyDomain && (
              <>
                <form onSubmit={handlePrivacySave} className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-6 space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-[10px] text-slate-500 block font-bold uppercase tracking-wider mb-1">Path</label>
                      <input type="text" value={privacyPath} onChange={e => setPrivacyPath(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-orange-500" placeholder="/secret" />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 block font-bold uppercase tracking-wider mb-1">Username</label>
                      <input type="text" value={privacyUser} onChange={e => setPrivacyUser(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-orange-500" placeholder="admin" />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 block font-bold uppercase tracking-wider mb-1">Password</label>
                      <input type="password" value={privacyPass} onChange={e => setPrivacyPass(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-orange-500" placeholder="••••••" />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button type="submit" disabled={privacySaving} className="px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:bg-slate-300 text-white font-bold text-xs rounded-lg shadow transition">
                      {privacySaving ? 'Protecting...' : 'Protect Directory'}
                    </button>
                  </div>
                </form>

                <div className="flex-1 overflow-y-auto">
                  <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">Protected Directories</h3>
                  {privacyLoading ? (
                    <div className="text-xs text-slate-400 py-4 text-center">Loading...</div>
                  ) : privacyRules.length === 0 ? (
                    <div className="text-xs text-slate-400 py-4 text-center bg-slate-50 rounded-lg border border-slate-200">No protected directories for {privacyDomain}.</div>
                  ) : (
                    <div className="space-y-2">
                      {privacyRules.map((rule, i) => (
                        <div key={i} className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5">
                          <div className="flex-1 min-w-0">
                            <span className="font-mono text-xs text-violet-600 font-bold">{rule.path}</span>
                            <span className="text-xs text-slate-500 ml-3">User: {rule.username}</span>
                            <span className={`ml-2 px-1.5 py-0.5 rounded text-[9px] font-bold ${rule.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>{rule.enabled ? 'ACTIVE' : 'DISABLED'}</span>
                          </div>
                          <button onClick={() => handlePrivacyDelete(rule.domain, rule.path)} className="ml-3 text-xs text-rose-500 hover:text-rose-700 font-bold flex-shrink-0">Remove</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ============ MULTIPHP INI EDITOR MODAL ============ */}
      {showIniModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-6">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-8 shadow-2xl relative">
            <button onClick={() => setShowIniModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-700 text-sm font-bold">X</button>
            <h2 className="text-lg font-black text-slate-800 mb-1">MultiPHP INI Editor</h2>
            <p className="text-xs text-slate-500 mb-6 font-medium">Easily adjust PHP configuration limits for <code className="text-xs font-mono text-orange-600 bg-orange-50 px-1 rounded">{iniDomain}</code>.</p>

            {iniLoading ? (
              <div className="text-xs text-slate-400 py-8 text-center">Loading settings...</div>
            ) : (
              <form onSubmit={handleSaveIniSettings} className="space-y-4">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1 font-semibold uppercase tracking-wider">Memory Limit</label>
                  <select
                    value={iniMemoryLimit}
                    onChange={e => setIniMemoryLimit(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none"
                  >
                    {['64M', '128M', '256M', '512M', '1024M', '2048M'].map(v => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1 font-semibold uppercase tracking-wider">Max Upload Size</label>
                    <select
                      value={iniUploadLimit}
                      onChange={e => setIniUploadLimit(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 text-xs text-slate-800 focus:outline-none"
                    >
                      {['2M', '8M', '16M', '32M', '64M', '128M', '256M', '512M', '1024M'].map(v => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1 font-semibold uppercase tracking-wider">Max Post Size</label>
                    <select
                      value={iniPostLimit}
                      onChange={e => setIniPostLimit(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 text-xs text-slate-800 focus:outline-none"
                    >
                      {['2M', '8M', '16M', '32M', '64M', '128M', '256M', '512M', '1024M'].map(v => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1 font-semibold uppercase tracking-wider">Max Exec Time (sec)</label>
                    <input
                      type="number"
                      required
                      value={iniExecTime}
                      onChange={e => setIniExecTime(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none"
                      placeholder="e.g. 120"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1 font-semibold uppercase tracking-wider">Max Input Vars</label>
                    <input
                      type="number"
                      required
                      value={iniInputVars}
                      onChange={e => setIniInputVars(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none"
                      placeholder="e.g. 1000"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => { setShowIniModal(false); setShowPHPManagerModal(true); }}
                    className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={iniSaving}
                    className="px-5 py-2 bg-orange-600 hover:bg-orange-500 disabled:bg-slate-200 text-white rounded-lg text-xs font-bold shadow transition"
                  >
                    {iniSaving ? 'Saving...' : 'Apply Limits'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ============ SECURITY CENTER MODAL ============ */}
      {showSecurityCenterModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-6">
          <div className="bg-white border border-slate-200 rounded-xl max-w-4xl w-full p-8 shadow-2xl relative flex flex-col max-h-[85vh]">
            <button onClick={() => setShowSecurityCenterModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-700 text-sm font-bold">X</button>
            
            <div className="flex items-center space-x-3 mb-1">
              <svg className="w-6 h-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
              <h2 className="text-lg font-black text-slate-800">Security Center</h2>
            </div>
            <p className="text-xs text-slate-500 mb-6 font-medium">Protect your websites against exploits, scan files for malicious code, and monitor firewall brute-force prevention.</p>

            {/* Tabs Navigation */}
            <div className="flex space-x-2 border-b border-slate-200 mb-6">
              {[
                { id: 'waf', label: 'Web Application Firewall (WAF)' },
                { id: 'malware', label: 'Malware Scanner' },
                { id: 'fail2ban', label: 'Intrusion Prevention (IPS)' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setSecurityActiveTab(tab.id)}
                  className={`px-4 py-2 text-xs font-bold -mb-px border-b-2 transition-colors ${securityActiveTab === tab.id ? 'border-orange-600 text-orange-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab content container */}
            <div className="flex-1 overflow-y-auto min-h-0 space-y-4">
              
              {/* ============ TAB: WAF ============ */}
              {securityActiveTab === 'waf' && (
                <div className="space-y-4">
                  <div className="bg-orange-50 border border-orange-100 rounded-lg p-4 text-xs text-orange-800 font-medium font-semibold">
                    🛡️ ModSecurity & OWASP CRS Enabled: ModSecurity inspects HTTP requests and automatically blocks SQL injection, XSS, and local file inclusions. Toggle per-site below.
                  </div>

                  <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-xs">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                          <th className="px-5 py-3">Domain</th>
                          <th className="px-5 py-3">Ruleset</th>
                          <th className="px-5 py-3">WAF Engine</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                        {sites.length === 0 ? (
                          <tr>
                            <td colSpan="3" className="px-5 py-8 text-center text-slate-400">No websites created yet. Create a website to manage its WAF settings.</td>
                          </tr>
                        ) : (
                          sites.map(site => (
                            <tr key={site.domain} className="hover:bg-slate-50">
                              <td className="px-5 py-4 font-mono text-slate-900">{site.domain}</td>
                              <td className="px-5 py-4 text-slate-500">OWASP CRS v3.3 (Paranoia 1)</td>
                              <td className="px-5 py-4">
                                <button
                                  onClick={() => handleToggleWAF(site.domain, !site.wafEnabled)}
                                  disabled={wafToggling === site.domain}
                                  className={`relative w-11 h-5 rounded-full transition-colors flex items-center ${site.wafEnabled ? 'bg-orange-500' : 'bg-slate-300'}`}
                                >
                                  <span className={`absolute bg-white w-4 h-4 rounded-full shadow transition-transform ${site.wafEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ============ TAB: MALWARE ============ */}
              {securityActiveTab === 'malware' && (
                <div className="space-y-6">
                  {/* Scan trigger */}
                  <form onSubmit={handleStartScan} className="bg-slate-50 border border-slate-200 rounded-lg p-5 flex items-end space-x-4">
                    <div className="flex-1">
                      <label className="text-[10px] text-slate-500 block font-bold uppercase tracking-wider mb-1">Select Domain to Scan</label>
                      <select
                        value={scanningDomain}
                        onChange={e => setScanningDomain(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-orange-500 font-semibold"
                      >
                        <option value="">-- Select Domain --</option>
                        {sites.map(s => <option key={s.domain} value={s.domain}>{s.domain}</option>)}
                      </select>
                    </div>
                    <button
                      type="submit"
                      disabled={scanActionLoading || !scanningDomain || (scanStatus && scanStatus.running)}
                      className="px-5 py-2 bg-orange-600 hover:bg-orange-500 disabled:bg-slate-300 text-white font-bold text-xs rounded-lg shadow-sm transition"
                    >
                      {scanActionLoading ? 'Starting...' : 'Run Scan'}
                    </button>
                  </form>

                  {/* Active Scan Status */}
                  {scanStatus && (scanStatus.running || scanStatus.message) && (
                    <div className={`border rounded-lg p-5 ${scanStatus.running ? 'bg-sky-50 border-sky-100 text-sky-800' : scanStatus.result === 'clean' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : scanStatus.result === 'infected' ? 'bg-rose-50 border-rose-100 text-rose-800' : 'bg-slate-50 border-slate-100 text-slate-700'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-xs font-black uppercase tracking-wider">Current Scan Status</div>
                        {scanStatus.running && (
                          <div className="flex items-center space-x-2">
                            <span className="animate-spin rounded-full h-3 w-3 border-2 border-sky-600 border-t-transparent" />
                            <span className="text-[10px] font-bold">Scanning...</span>
                          </div>
                        )}
                      </div>
                      <div className="font-semibold text-xs leading-relaxed">{scanStatus.message}</div>
                    </div>
                  )}

                  {/* Scan History */}
                  <div>
                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">Scan History & Reports</h3>
                    <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-xs">
                      {scanHistoryLoading ? (
                        <div className="text-xs text-slate-400 py-8 text-center">Loading scan history...</div>
                      ) : scanHistory.length === 0 ? (
                        <div className="text-xs text-slate-400 py-8 text-center">No scans executed yet. Run a scan above to audit your site files.</div>
                      ) : (
                        <div className="divide-y divide-slate-100">
                          {scanHistory.map((report, i) => (
                            <div key={i} className="p-4 hover:bg-slate-50">
                              <div className="flex items-center justify-between mb-2">
                                <div className="font-bold text-xs text-slate-800 flex items-center space-x-2">
                                  <span className="font-mono text-orange-600">{report.scanId}</span>
                                  <span className="text-slate-300">|</span>
                                  <span className="text-[10px] text-slate-400">{report.started}</span>
                                </div>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${report.totalHits > 0 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                  {report.totalHits > 0 ? `${report.totalHits} Malware Found` : 'Clean'}
                                </span>
                              </div>
                              
                              <div className="grid grid-cols-4 gap-2 text-[10px] font-bold text-slate-500 uppercase">
                                <div>Path: <span className="font-mono font-medium text-slate-700 normal-case">{report.path}</span></div>
                                <div>Files: <span className="font-medium text-slate-700">{report.totalFiles}</span></div>
                                <div>Elapsed: <span className="font-medium text-slate-700">{report.elapsed}</span></div>
                                <div>Cleaned: <span className="font-medium text-slate-700">{report.totalCleaned}</span></div>
                              </div>

                              {report.hits && report.hits.length > 0 && (
                                <div className="mt-3 bg-rose-50/50 border border-rose-100/50 rounded p-3 font-mono text-[10px] text-rose-800 max-h-32 overflow-y-auto space-y-1">
                                  <div className="font-bold uppercase mb-1">Infected Files:</div>
                                  {report.hits.map((hit, idx) => <div key={idx}>⚠️ {hit}</div>)}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ============ TAB: FAIL2BAN ============ */}
              {securityActiveTab === 'fail2ban' && (
                <div className="space-y-6">
                  <div className="bg-sky-50 border border-sky-100 rounded-lg p-4 text-xs text-sky-800 font-medium">
                    🛡️ Fail2ban Intrusion Prevention Active: Monitor active brute-force bans. Banned IPs are automatically rejected by firewall rules until unbanned.
                  </div>

                  {fail2banLoading ? (
                    <div className="text-xs text-slate-400 py-8 text-center">Loading Fail2ban jails...</div>
                  ) : fail2banJails.length === 0 ? (
                    <div className="text-xs text-slate-400 py-8 text-center bg-slate-50 rounded-lg border border-slate-200">No active Fail2ban jails discovered. Check system logs.</div>
                  ) : (
                    fail2banJails.map(jail => (
                      <div key={jail.name} className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                        <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-xs text-slate-800">Jail: <span className="font-mono text-orange-600">{jail.name}</span></span>
                            <span className="bg-rose-100 text-rose-700 text-[10px] font-bold px-2 py-0.5 rounded-full">{jail.currentlyBanned} banned</span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-bold uppercase">Total history bans: {jail.totalBanned}</span>
                        </div>
                        
                        <div className="p-5">
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-3">Currently Banned IPs</h4>
                          {jail.bannedIps.length === 0 ? (
                            <div className="text-xs text-slate-400 py-3 text-center bg-slate-50 rounded-lg border border-slate-200">No IPs currently banned in this jail.</div>
                          ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                              {jail.bannedIps.map(ip => (
                                <div key={ip} className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs">
                                  <span className="font-mono text-slate-700 font-bold">{ip}</span>
                                  <button
                                    onClick={() => handleFail2banUnban(jail.name, ip)}
                                    className="text-[10px] text-rose-600 hover:text-rose-800 font-black uppercase tracking-wider cursor-pointer"
                                  >
                                    Unban
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* ============ REMOTE MYSQL MODAL ============ */}
      {showRemoteDBModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-6">
          <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full p-8 shadow-2xl relative">
            <button onClick={() => setShowRemoteDBModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-700 text-sm font-bold">X</button>
            <h2 className="text-lg font-black text-slate-800 mb-1">Remote MySQL Access</h2>
            <p className="text-xs text-slate-500 mb-6 font-medium">Allow external applications to connect to your MySQL databases over the network.</p>

            {remoteDBLoading ? (
              <div className="text-xs text-slate-400 py-8 text-center">Loading remote MySQL status...</div>
            ) : (
              <div className="space-y-5">
                {/* Master Toggle */}
                <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg p-4">
                  <div>
                    <div className="text-xs font-bold text-slate-700">Remote Connections</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Opens MySQL port 3306 and binds to all interfaces</div>
                  </div>
                  <button
                    onClick={handleRemoteDBToggle}
                    disabled={remoteDBToggling}
                    className={`relative w-12 h-6 rounded-full transition-colors ${remoteDBEnabled ? 'bg-emerald-500' : 'bg-slate-300'}`}
                  >
                    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${remoteDBEnabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
                  </button>
                </div>

                {remoteDBEnabled && (
                  <div className={`bg-amber-50 border border-amber-200 rounded-lg p-3 text-[10px] text-amber-700 font-medium`}>
                    ⚠️ Port 3306 is open. Only whitelisted IPs below will have database access. Ensure you trust all listed addresses.
                  </div>
                )}

                {/* IP Whitelist */}
                <div>
                  <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2">Whitelisted IPs ({remoteDBIPs.length})</h3>
                  {remoteDBIPs.length === 0 ? (
                    <div className="text-xs text-slate-400 py-3 text-center bg-slate-50 rounded-lg border border-slate-200">No IPs whitelisted.</div>
                  ) : (
                    <div className="space-y-1.5 mb-3">
                      {remoteDBIPs.map((ip, i) => (
                        <div key={i} className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-4 py-2">
                          <span className="font-mono text-xs text-slate-700 font-bold">{ip}</span>
                          <button onClick={() => handleRemoteDBRemoveIP(ip)} className="text-xs text-rose-500 hover:text-rose-700 font-bold">Revoke</button>
                        </div>
                      ))}
                    </div>
                  )}

                  <form onSubmit={handleRemoteDBAddIP} className="flex items-center space-x-2 mt-3">
                    <input
                      type="text"
                      value={remoteDBNewIP}
                      onChange={e => setRemoteDBNewIP(e.target.value)}
                      className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-orange-500"
                      placeholder="e.g. 203.0.113.50"
                    />
                    <button type="submit" className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-lg shadow transition">Add IP</button>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============ Drag-and-Drop Website Builder Modal ============ */}
      {showWebBuilderModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex flex-col z-50 p-4">
          {/* Header Panel */}
          <div className="bg-white border border-slate-200 rounded-t-xl px-6 py-4 flex flex-wrap items-center justify-between shadow-md space-y-2 sm:space-y-0">
            <div className="flex items-center space-x-3">
              <button 
                onClick={() => {
                  if (editorInstance) {
                    try { editorInstance.destroy(); } catch (err) { console.error(err); }
                    setEditorInstance(null);
                  }
                  setShowWebBuilderModal(false);
                }} 
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition cursor-pointer"
              >
                ← Back
              </button>
              <div className="h-5 w-px bg-slate-200" />
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25A2.25 2.25 0 0113.5 8.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                </svg>
                <span className="font-extrabold text-sm text-slate-800 uppercase tracking-wider">Aether Site Builder</span>
              </div>
              <span className="bg-indigo-100 text-indigo-800 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">GrapesJS Editor</span>
            </div>

            {/* Controls */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Target Domain:</span>
                <select
                  value={webBuilderDomain}
                  onChange={e => {
                    setWebBuilderDomain(e.target.value);
                    initWebBuilder(e.target.value);
                  }}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 font-semibold focus:outline-none"
                >
                  {sites.map(s => <option key={s.domain} value={s.domain}>{s.domain}</option>)}
                </select>
              </div>

              <div className="h-5 w-px bg-slate-200" />

              <button
                onClick={handleSaveDraft}
                disabled={webBuilderSaving || webBuilderLoading}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-200 text-white font-bold text-xs rounded-lg shadow-sm transition flex items-center space-x-1 cursor-pointer"
              >
                {webBuilderSaving ? (
                  <>
                    <span className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent mr-1" />
                    <span>Saving...</span>
                  </>
                ) : 'Save Draft'}
              </button>

              <button
                onClick={handlePublishSite}
                disabled={webBuilderPublishing || webBuilderLoading}
                className="px-5 py-2 bg-orange-600 hover:bg-orange-500 disabled:bg-slate-200 text-white font-bold text-xs rounded-lg shadow-md transition flex items-center space-x-1 cursor-pointer"
              >
                {webBuilderPublishing ? (
                  <>
                    <span className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent mr-1" />
                    <span>Publishing...</span>
                  </>
                ) : 'Publish Website'}
              </button>
            </div>
          </div>

          {/* Builder Canvas Area */}
          <div className="flex-1 bg-slate-100 border-x border-b border-slate-200 rounded-b-xl overflow-hidden relative min-h-0">
            {webBuilderLoading ? (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-xs flex flex-col items-center justify-center space-y-3 z-50">
                <span className="animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent" />
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Loading Builder Assets...</span>
              </div>
            ) : null}
            
            {/* GrapesJS editor mount node */}
            <div id="gjs" className="h-full w-full" />
          </div>
        </div>
      )}

      {/* 1-Click Site Templates Installer Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-6 animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-4xl w-full p-8 shadow-2xl relative flex flex-col max-h-[90vh]">
            <button 
              onClick={() => { if (!templateInstalling) setShowTemplateModal(false); }} 
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-700 text-sm font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition cursor-pointer border-none bg-transparent"
            >
              ✕
            </button>
            
            <div className="mb-6">
              <span className="bg-rose-100 text-rose-800 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider mb-2 inline-block">1-Click Deployer</span>
              <h2 className="text-2xl font-black text-slate-800 leading-tight">1-Click Website Templates</h2>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                Choose a pre-built professional design to launch a complete, fully functioning website in seconds. Customize it visually with Elementor.
              </p>
            </div>

            <form onSubmit={handleTemplateInstallSubmit} className="flex flex-col flex-1 min-h-0 space-y-6">
              {/* Template Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto pr-1 py-1 flex-1 min-h-0">
                {/* E-Commerce Card */}
                <div 
                  onClick={() => { if (!templateInstalling) setTemplateInstallType('ecommerce'); }}
                  className={`border-2 rounded-xl p-6 cursor-pointer transition-all duration-300 relative flex flex-col justify-between ${
                    templateInstallType === 'ecommerce' 
                      ? 'border-rose-500 bg-rose-50/20 shadow-md ring-1 ring-rose-500/20' 
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <span className="bg-purple-100 text-purple-800 text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider">WooCommerce Store</span>
                      {templateInstallType === 'ecommerce' && (
                        <div className="w-5 h-5 bg-rose-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold">✓</div>
                      )}
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 mb-2">E-Commerce Brand Store</h3>
                    <p className="text-xs text-slate-500 leading-relaxed mb-4">
                      A complete online shopping portal powered by WooCommerce. Comes with pre-loaded product layouts, checkout pages, cart dropdowns, and mock retail products.
                    </p>
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {['WooCommerce', 'Astra Theme', 'Elementor Builder', 'Product Grid', 'Cart System'].map(tag => (
                        <span key={tag} className="bg-slate-100 text-slate-600 text-[9px] px-2 py-0.5 rounded-full font-semibold">{tag}</span>
                      ))}
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider border-t border-slate-100 pt-3">
                    Editing: Elementor Visual Builder
                  </div>
                </div>

                {/* Informative Card */}
                <div 
                  onClick={() => { if (!templateInstalling) setTemplateInstallType('informative'); }}
                  className={`border-2 rounded-xl p-6 cursor-pointer transition-all duration-300 relative flex flex-col justify-between ${
                    templateInstallType === 'informative' 
                      ? 'border-rose-500 bg-rose-50/20 shadow-md ring-1 ring-rose-500/20' 
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <span className="bg-blue-100 text-blue-800 text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider">Corporate Site</span>
                      {templateInstallType === 'informative' && (
                        <div className="w-5 h-5 bg-rose-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold">✓</div>
                      )}
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 mb-2">Corporate Informative Site</h3>
                    <p className="text-xs text-slate-500 leading-relaxed mb-4">
                      A clean business layout ideal for agencies, consultants, and startups. Includes responsive layouts for Home, About, Services, and Contact pages with a working contact form.
                    </p>
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {['Elementor Builder', 'Astra Theme', 'Contact Forms', 'SEO Friendly', 'Fast Load'].map(tag => (
                        <span key={tag} className="bg-slate-100 text-slate-600 text-[9px] px-2 py-0.5 rounded-full font-semibold">{tag}</span>
                      ))}
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider border-t border-slate-100 pt-3">
                    Editing: Elementor Visual Builder
                  </div>
                </div>
              </div>

              {/* Form Controls */}
              <div className="border-t border-slate-200 pt-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1.5 font-semibold uppercase tracking-wider">Target Domain for Deployment</label>
                    <select 
                      required 
                      value={templateInstallDomain} 
                      onChange={e => setTemplateInstallDomain(e.target.value)} 
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-xs font-semibold focus:outline-none focus:border-rose-500"
                      disabled={templateInstalling}
                    >
                      <option value="">-- Choose domain --</option>
                      {sites.map(s => (
                        <option key={s.domain} value={s.domain}>{s.domain}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex justify-end space-x-3">
                    <button 
                      type="button" 
                      onClick={() => setShowTemplateModal(false)} 
                      className="px-5 py-2.5 text-xs font-semibold text-slate-500 hover:text-slate-800 border border-slate-200 rounded-lg hover:bg-slate-50 transition cursor-pointer"
                      disabled={templateInstalling}
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      disabled={templateInstalling || !templateInstallDomain} 
                      className="px-6 py-2.5 bg-rose-600 hover:bg-rose-500 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-lg text-xs font-bold shadow-md transition flex items-center space-x-2 cursor-pointer border-none"
                    >
                      {templateInstalling ? (
                        <>
                          <span className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent mr-1" />
                          <span>Installing Template...</span>
                        </>
                      ) : (
                        <span>Deploy Template</span>
                      )}
                    </button>
                  </div>
                </div>

                {templateInstallStatus && (
                  <div className={`text-xs font-semibold p-3.5 rounded-lg flex items-center space-x-2.5 ${
                    templateInstallStatus.startsWith('Success') 
                      ? 'text-emerald-700 bg-emerald-50 border border-emerald-200' 
                      : templateInstallStatus.startsWith('Failed') || templateInstallStatus.startsWith('Error')
                        ? 'text-rose-700 bg-rose-50 border border-rose-200' 
                        : 'text-orange-700 bg-orange-50 border border-orange-200'
                  }`}>
                    {!templateInstallStatus.startsWith('Success') && !templateInstallStatus.startsWith('Failed') && !templateInstallStatus.startsWith('Error') && (
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    )}
                    <span>{templateInstallStatus}</span>
                  </div>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
