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
