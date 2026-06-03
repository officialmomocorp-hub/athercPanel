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
