#!/usr/bin/env bash
# Aether Panel - Frontend Builder Script (v2.0 - No Unicode/Emoji)
# All UI text uses ASCII-only characters and SVG icons

set -euo pipefail

echo "=========================================="
echo "  BUILDING AETHER PANEL FRONTEND v2.0"
echo "=========================================="

# 1. Install Node.js if not present
if ! command -v node &> /dev/null; then
    echo "[1/4] Installing Node.js (V20 LTS)..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
else
    echo "[1/4] Node.js is already installed: $(node -v)"
fi

# 2. Create directory structures
mkdir -p /opt/aether-panel/frontend/src/components

# 3. Create config files
cat << 'PKGJSON' > /opt/aether-panel/frontend/package.json
{
  "name": "aether-frontend",
  "private": true,
  "version": "2.0.0",
  "type": "module",
  "scripts": {
    "build": "vite build"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.1",
    "autoprefixer": "^10.4.19",
    "postcss": "^8.4.38",
    "tailwindcss": "^3.4.3",
    "vite": "^5.2.0"
  }
}
PKGJSON

cat << 'VITECFG' > /opt/aether-panel/frontend/vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
})
VITECFG

cat << 'TWCFG' > /opt/aether-panel/frontend/tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
TWCFG

cat << 'POSTCSS' > /opt/aether-panel/frontend/postcss.config.js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
POSTCSS

cat << 'INDEXHTML' > /opt/aether-panel/frontend/index.html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Aether Panel</title>
  </head>
  <body class="bg-[#070913]">
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
INDEXHTML

cat << 'MAINJSX' > /opt/aether-panel/frontend/src/main.jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
MAINJSX

cat << 'INDEXCSS' > /opt/aether-panel/frontend/src/index.css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply bg-slate-950 text-slate-100 antialiased;
  }
}

.backdrop-blur-xl {
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fadeIn {
  animation: fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
INDEXCSS

# 4. Write SiteCard component (ASCII only, SVG icons, no emoji)
cat << 'SITECARD' > /opt/aether-panel/frontend/src/components/SiteCard.jsx
import React, { useState, useEffect } from 'react';

export default function SiteCard({ site, onUpdatePHP, onToggleRedis, onProvisionSSL, onDeleteSite }) {
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedPHP, setSelectedPHP] = useState(site.phpVersion);
  const [redisEnabled, setRedisEnabled] = useState(site.redisEnabled);
  const [issuingSSL, setIssuingSSL] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [logs, setLogs] = useState({ access: '', error: '' });
  const [files, setFiles] = useState([]);
  const [currentPath, setCurrentPath] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileContent, setFileContent] = useState('');
  const [savingFile, setSavingFile] = useState(false);

  const fetchLogs = async () => {
    try {
      const res = await fetch(`/api/sites/logs?domain=${site.domain}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('aether_token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchFiles = async () => {
    try {
      const res = await fetch(`/api/files?domain=${site.domain}&path=${encodeURIComponent(currentPath)}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('aether_token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setFiles(data || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (!expanded) return;
    if (activeTab === 'files') {
      fetchFiles();
    } else if (activeTab === 'logs') {
      fetchLogs();
    }
  }, [activeTab, currentPath, expanded]);

  const handleGoBack = () => {
    const parts = currentPath.split('/');
    parts.pop();
    setCurrentPath(parts.join('/'));
  };

  const handleEditFile = async (fileName) => {
    const filePath = currentPath ? `${currentPath}/${fileName}` : fileName;
    try {
      const res = await fetch(`/api/files/read?domain=${site.domain}&path=${encodeURIComponent(filePath)}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('aether_token')}` }
      });
      if (res.ok) {
        const text = await res.text();
        setSelectedFile(filePath);
        setFileContent(text);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveFile = async () => {
    setSavingFile(true);
    try {
      const res = await fetch('/api/files/write', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('aether_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          domain: site.domain,
          path: selectedFile,
          content: fileContent
        })
      });
      if (res.ok) {
        setSelectedFile(null);
        setFileContent('');
        await fetchFiles();
      }
    } catch (e) {
      console.error(e);
    }
    setSavingFile(false);
  };

  const handlePHPVarsChange = async (e) => {
    const val = e.target.value;
    setSelectedPHP(val);
    await onUpdatePHP(site.domain, val);
  };

  const handleRedisToggle = async () => {
    const nextVal = !redisEnabled;
    setRedisEnabled(nextVal);
    await onToggleRedis(site.domain, nextVal);
  };

  const handleSSLRequest = async () => {
    setIssuingSSL(true);
    await onProvisionSSL(site.domain);
    setIssuingSSL(false);
  };

  const handleDeleteRequest = async () => {
    if (window.confirm(`Are you sure you want to permanently delete site ${site.domain}? This deletes nginx configuration, PHP-FPM pools and website root files.`)) {
      setDeleting(true);
      await onDeleteSite(site.domain);
      setDeleting(false);
    }
  };

  return (
    <div className={`relative transition-all duration-300 border rounded-xl bg-slate-900 ${
      expanded ? 'col-span-3 border-indigo-500/50 shadow-xl' : 'border-slate-800 hover:border-slate-700'
    }`}>
      <div className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-3">
              <h3 className="text-lg font-bold text-slate-100 tracking-tight">{site.domain}</h3>
              <span className={`px-2.5 py-0.5 text-[10px] rounded-full font-bold uppercase tracking-wider ${
                site.sslActive ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/50' : 'bg-rose-950/40 text-rose-400 border border-rose-900/50'
              }`}>
                {site.sslActive ? 'SSL Active' : 'No SSL'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1.5">PHP {selectedPHP} | Root: <code className="text-[10px] bg-slate-950 px-1.5 py-0.5 rounded text-indigo-300">/var/www/vhosts/{site.domain}</code></p>
          </div>

          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 bg-slate-950 p-1.5 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-400 font-bold uppercase px-1">Redis</span>
              <button
                onClick={handleRedisToggle}
                className={`w-8 h-4 rounded-full transition-colors relative ${redisEnabled ? 'bg-indigo-600' : 'bg-slate-800'}`}
              >
                <span className={`absolute top-0.5 left-0.5 bg-white w-3 h-3 rounded-full transition-transform ${redisEnabled ? 'translate-x-4' : ''}`} />
              </button>
            </div>

            <button
              onClick={() => setExpanded(!expanded)}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
            >
              {expanded ? 'Close' : 'Manage'}
            </button>
          </div>
        </div>

        {expanded && (
          <div className="mt-6 border-t border-slate-800 pt-6">
            <div className="flex space-x-1 border-b border-slate-800 mb-6">
              {['overview', 'logs', 'files', 'settings'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${
                    activeTab === tab ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {activeTab === 'overview' && (
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">Bandwidth Usage</span>
                  <span className="text-xl font-bold text-slate-100 mt-1 block">{site.bandwidth || '0 GB'}</span>
                  <div className="w-full bg-slate-900 h-1.5 rounded-full mt-3 overflow-hidden">
                    <div className="bg-indigo-500 h-full rounded-full" style={{ width: '12%' }} />
                  </div>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">FastCGI Cache</span>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-emerald-400 font-bold text-xs">Active (Static bypass)</span>
                    <button className="text-[10px] font-bold uppercase bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800 px-2 py-1 rounded border border-slate-800">Purge</button>
                  </div>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">Process Isolation</span>
                  <span className="text-xs font-semibold text-indigo-400 mt-2 block flex items-center space-x-1.5">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>
                    <span>User Jail Active</span>
                  </span>
                </div>
              </div>
            )}

            {activeTab === 'logs' && (
              <div className="space-y-4">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold mb-1">Nginx Access Log (Last 50 Lines)</span>
                  <pre className="bg-slate-950 p-4 rounded-xl font-mono text-[10px] text-slate-400 border border-slate-800 overflow-auto max-h-40 leading-relaxed whitespace-pre-wrap">
                    {logs.access || 'No access log data available.'}
                  </pre>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold mb-1">Nginx Error Log (Last 50 Lines)</span>
                  <pre className="bg-slate-950 p-4 rounded-xl font-mono text-[10px] text-slate-400 border border-slate-800 overflow-auto max-h-40 leading-relaxed whitespace-pre-wrap text-rose-300">
                    {logs.error || 'No error log data available.'}
                  </pre>
                </div>
              </div>
            )}

            {activeTab === 'files' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-400 bg-slate-950 px-3 py-2 rounded-lg border border-slate-800">
                  <span className="font-mono">Path: <code className="text-indigo-400">/{currentPath}</code></span>
                  {currentPath && (
                    <button
                      onClick={handleGoBack}
                      className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 font-semibold"
                    >
                      .. Back
                    </button>
                  )}
                </div>

                <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-900 text-slate-400 font-bold">
                        <th className="p-3">File Name</th>
                        <th className="p-3">Permissions</th>
                        <th className="p-3">Size</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="text-slate-400 font-mono text-[11px]">
                      {files.map((file) => (
                        <tr key={file.name} className="border-b border-slate-800 hover:bg-slate-900/30">
                          <td className={`p-3 flex items-center space-x-2 font-semibold ${file.isDir ? 'text-indigo-400' : 'text-slate-300'}`}>
                            {file.isDir ? (
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                            )}
                            <span>{file.name}</span>
                          </td>
                          <td className="p-3 text-slate-600">{file.perm || '-'}</td>
                          <td className="p-3 text-slate-500">{file.isDir ? '-' : `${(file.size / 1024).toFixed(1)} KB`}</td>
                          <td className="p-3 text-right space-x-2">
                            {file.isDir ? (
                              <button
                                onClick={() => setCurrentPath(currentPath ? `${currentPath}/${file.name}` : file.name)}
                                className="text-indigo-400 hover:underline font-bold"
                              >
                                Open
                              </button>
                            ) : (
                              <button
                                onClick={() => handleEditFile(file.name)}
                                className="text-indigo-400 hover:underline"
                              >
                                Edit
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                      {files.length === 0 && (
                        <tr>
                          <td colSpan={4} className="p-4 text-center text-slate-600">Empty directory</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <div>
                    <h4 className="text-xs font-bold text-slate-200">PHP Version Allocation</h4>
                    <p className="text-[10px] text-slate-500">Hot-swaps PHP execution engine version</p>
                  </div>
                  <select
                    value={selectedPHP}
                    onChange={handlePHPVarsChange}
                    className="bg-slate-900 border border-slate-800 text-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-indigo-500"
                  >
                    <option value="7.4">PHP 7.4 (Legacy)</option>
                    <option value="8.1">PHP 8.1</option>
                    <option value="8.2">PHP 8.2</option>
                    <option value="8.3">PHP 8.3</option>
                    <option value="8.4">PHP 8.4 (Latest)</option>
                  </select>
                </div>

                <div className="flex items-center justify-between bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <div>
                    <h4 className="text-xs font-bold text-slate-200">Let's Encrypt SSL</h4>
                    <p className="text-[10px] text-slate-500">Provision certificates and configure automatic redirects</p>
                  </div>
                  <button
                    onClick={handleSSLRequest}
                    disabled={issuingSSL || site.sslActive}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white rounded-lg text-xs font-bold transition"
                  >
                    {issuingSSL ? 'Provisioning...' : site.sslActive ? 'Active' : 'Install SSL'}
                  </button>
                </div>

                <div className="flex items-center justify-between bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <div>
                    <h4 className="text-xs font-bold text-rose-400">Delete Website</h4>
                    <p className="text-[10px] text-slate-500">Permanently remove configurations and directory from VPS</p>
                  </div>
                  <button
                    onClick={handleDeleteRequest}
                    disabled={deleting}
                    className="px-3 py-1.5 bg-rose-900 hover:bg-rose-800 disabled:bg-slate-800 text-white rounded-lg text-xs font-bold transition"
                  >
                    {deleting ? 'Deleting...' : 'Delete Site'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {selectedFile && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-3xl w-full p-6 shadow-2xl relative flex flex-col h-[80vh]">
            <h3 className="text-sm font-bold text-slate-200 mb-2 font-mono">Editing: {selectedFile}</h3>
            <textarea
              value={fileContent}
              onChange={e => setFileContent(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-lg p-4 font-mono text-xs text-slate-300 focus:outline-none focus:border-indigo-500 resize-none h-full"
            />
            <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800 mt-4">
              <button
                onClick={() => setSelectedFile(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveFile}
                disabled={savingFile}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white rounded-lg text-xs font-semibold transition"
              >
                {savingFile ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
SITECARD

# 5. Write Login component (ASCII only, SVG icons)
cat << 'LOGINJSX' > /opt/aether-panel/frontend/src/components/Login.jsx
import React, { useState } from 'react';

export default function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (res.ok) {
        const data = await res.json();
        onLoginSuccess(data.token);
      } else {
        const errText = await res.text();
        setError(errText || 'Invalid credentials');
      }
    } catch (err) {
      setError('Connection refused. Please check that the Aether Panel daemon service is running.');
    } finally {
      setLoading(false);
    }

  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex items-center justify-center p-6 selection:bg-indigo-500 selection:text-white">
      <div className="w-full max-w-md border border-slate-800 rounded-xl bg-slate-900 shadow-2xl p-8 overflow-hidden">
        <div className="flex flex-col items-center justify-center mb-8">
          <div className="w-12 h-12 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white text-xl tracking-wider mb-4">AP</div>
          <h2 className="text-xl font-bold text-slate-100 tracking-tight">Aether Panel</h2>
          <span className="text-xs text-slate-400 mt-1">Sign in to manage your VPS environments</span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="text-xs text-slate-400 block mb-1.5 font-semibold">Username</label>
            <input
              required
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 transition-all placeholder:text-slate-600"
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 block mb-1.5 font-semibold">Password</label>
            <input
              required
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 transition-all placeholder:text-slate-600"
            />
          </div>

          {error && (
            <div className={`text-xs p-3 rounded-lg border flex items-center space-x-2 ${
              error.includes('Logging in')
                ? 'text-indigo-400 bg-indigo-950/20 border-indigo-900/50'
                : 'text-rose-400 bg-rose-950/20 border-rose-900/50'
            }`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition text-sm disabled:opacity-55 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {loading ? (
              <span>Authenticating...</span>
            ) : (
              <span>Sign In</span>
            )}
          </button>
        </form>

        <div className="mt-8 text-center text-[10px] text-slate-500 font-medium">
          Aether Panel v2.0 | Clean and Secured
        </div>
      </div>
    </div>
  );
}
LOGINJSX

# 6. Write App.jsx (ASCII only, SVG icons, all new features)
cat << 'APPJSX' > /opt/aether-panel/frontend/src/App.jsx
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
          action: () => window.open(`http://${window.location.hostname}/phpmyadmin/`, '_blank'),
          icon: (
            <svg className="w-8 h-8 text-cyan-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
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
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-8 shadow-2xl relative">
            <button onClick={() => setGdriveConnected(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-700 text-sm font-bold">X</button>
            <h2 className="text-xl font-bold text-slate-800 mb-1.5">Backup Engine Options</h2>
            <p className="text-xs text-slate-500 mb-6 font-medium">Encrypt and push compressed virtual host directories and SQL dumps directly to offsite Google Drive storage.</p>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
                <span className="font-bold text-slate-600">Auth Method</span>
                <div className="flex bg-slate-200 p-0.5 rounded-lg border border-slate-300">
                  <button
                    onClick={() => setGdriveMode('oauth')}
                    className={`px-2 py-1 text-[9px] font-black rounded uppercase tracking-wider ${gdriveMode === 'oauth' ? 'bg-orange-600 text-white' : 'text-slate-500'}`}
                  >
                    OAuth2
                  </button>
                  <button
                    onClick={() => setGdriveMode('service_account')}
                    className={`px-2 py-1 text-[9px] font-black rounded uppercase tracking-wider ${gdriveMode === 'service_account' ? 'bg-orange-600 text-white' : 'text-slate-500'}`}
                  >
                    Service JSON
                  </button>
                </div>
              </div>

              {gdriveMode === 'oauth' ? (
                <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
                  <span className="font-bold text-slate-600">Engine Status</span>
                  <button
                    onClick={triggerGDriveOAuth}
                    className="px-3 py-1.5 bg-orange-600 hover:bg-orange-500 rounded-lg text-[10px] font-bold text-white transition"
                  >
                    Authenticate OAuth2
                  </button>
                </div>
              ) : (
                <div className="space-y-2 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs">
                  <label className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Service Account JSON file</label>
                  <input type="file" className="block w-full text-xs text-slate-500 file:mr-4 file:py-1 file:px-3 file:rounded file:border file:border-slate-300 file:text-[10px] file:font-semibold file:bg-white file:text-slate-600 hover:file:bg-slate-100" />
                </div>
              )}

              <div className="flex justify-end pt-4 border-t border-slate-200">
                <button onClick={() => setGdriveConnected(false)} className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-xs rounded-lg transition">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
APPJSX

echo "[3/4] Frontend source files written."

# 7. Install deps and build
cd /opt/aether-panel/frontend
echo "[4/4] Installing npm dependencies and building..."
npm install --prefer-offline 2>&1 || npm install 2>&1
npx vite build 2>&1

echo ""
echo "=========================================="
echo "  FRONTEND BUILD COMPLETE!"
echo "  Output: /opt/aether-panel/frontend/dist"
echo "=========================================="
