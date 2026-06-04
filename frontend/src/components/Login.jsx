import React, { useState, useEffect } from 'react';

export default function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Dynamic Poppins Google Font Loader
  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, []);

  // HTML5 Interactive Canvas Premium Neon Galaxy Constellation Background
  useEffect(() => {
    const canvas = document.getElementById('login-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    let mouseX = width * 0.5;
    let mouseY = height * 0.5;
    let targetMouseX = mouseX;
    let targetMouseY = mouseY;
    let isMouseActive = false;
    let lastSpawnTime = 0;
    let time = 0;

    const dynamicParticles = [];
    const ambientParticles = [];
    
    // Premium neon sci-fi color palette
    const colors = ["#6366f1", "#a855f7", "#3b82f6", "#06b6d4", "#ec4899", "#14b8a6", "#f43f5e", "#10b981"];

    // Initialize 25 ambient particles with twinkling values
    const initAmbientParticles = () => {
      ambientParticles.length = 0;
      for (let i = 0; i < 25; i++) {
        ambientParticles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.35,
          vy: (Math.random() - 0.5) * 0.35,
          size: Math.random() * 2 + 1.2,
          color: colors[i % colors.length],
          phase: Math.random() * Math.PI * 2,
          twinkleSpeed: 0.01 + Math.random() * 0.02
        });
      }
    };

    initAmbientParticles();

    const handleMouseMove = (e) => {
      targetMouseX = e.clientX;
      targetMouseY = e.clientY;
      isMouseActive = true;

      // Rate limit spawning of cursor trail particles (max one per 14ms to maintain 60fps)
      const now = Date.now();
      if (now - lastSpawnTime > 14) {
        dynamicParticles.push({
          x: targetMouseX,
          y: targetMouseY,
          vx: (Math.random() - 0.5) * 2.0,
          vy: (Math.random() - 0.5) * 2.0 - 0.5, // Gentle upward drift
          size: Math.random() * 3.5 + 2.0,
          color: colors[Math.floor(Math.random() * colors.length)],
          life: 80,
          maxLife: 80
        });

        // Cap dynamic particles to prevent lag
        if (dynamicParticles.length > 80) {
          dynamicParticles.shift();
        }
        lastSpawnTime = now;
      }
    };

    const handleMouseDown = () => {
      // Spawn dynamic radial burst on click
      for (let i = 0; i < 25; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 5.0 + 2.5;
        dynamicParticles.push({
          x: targetMouseX,
          y: targetMouseY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: Math.random() * 4.0 + 2.5,
          color: colors[Math.floor(Math.random() * colors.length)],
          life: 70,
          maxLife: 70
        });
      }
    };

    const handleTouchStart = (e) => {
      if (e.touches.length === 1) {
        targetMouseX = e.touches[0].clientX;
        targetMouseY = e.touches[0].clientY;
        isMouseActive = true;
      }
    };

    const handleTouchMove = (e) => {
      if (e.touches.length === 1) {
        targetMouseX = e.touches[0].clientX;
        targetMouseY = e.touches[0].clientY;
        isMouseActive = true;
      }
    };

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      initAmbientParticles();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('touchstart', handleTouchStart);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('resize', handleResize);

    const animate = () => {
      time++;
      // Clear screen fully to prevent old line accumulation
      ctx.clearRect(0, 0, width, height);

      // Smooth easing follow for the mouse coordinate center
      mouseX += (targetMouseX - mouseX) * 0.12;
      mouseY += (targetMouseY - mouseY) * 0.12;

      // Draw subtle dynamic radial spotlight backdrop centered at the mouse
      if (isMouseActive) {
        const glowRad = ctx.createRadialGradient(mouseX, mouseY, 0, mouseX, mouseY, 280);
        glowRad.addColorStop(0, 'rgba(99, 102, 241, 0.09)'); // Indigo core
        glowRad.addColorStop(0.4, 'rgba(168, 85, 247, 0.04)'); // Violet mid
        glowRad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = glowRad;
        ctx.globalAlpha = 1.0;
        ctx.fillRect(0, 0, width, height);
      }

      // 1. Update and draw ambient twinkling stars
      for (let i = 0; i < ambientParticles.length; i++) {
        const ap = ambientParticles[i];
        
        // Gentle gravity pull toward cursor when nearby
        if (isMouseActive) {
          const dx = mouseX - ap.x;
          const dy = mouseY - ap.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 250) {
            const pull = (1 - dist / 250) * 0.12;
            ap.vx += (dx / dist) * pull;
            ap.vy += (dy / dist) * pull;
          }
        }

        ap.x += ap.vx;
        ap.y += ap.vy;

        // Apply friction to pull speeds
        ap.vx *= 0.97;
        ap.vy *= 0.97;

        // Wrap around screen edges
        if (ap.x < 0) ap.x = width;
        if (ap.x > width) ap.x = 0;
        if (ap.y < 0) ap.y = height;
        if (ap.y > height) ap.y = 0;

        // Twinkle effect (sinusoidal scaling of opacity)
        const twinkleAlpha = 0.15 + (Math.sin(time * ap.twinkleSpeed + ap.phase) + 1) * 0.2;

        ctx.beginPath();
        ctx.arc(ap.x, ap.y, ap.size, 0, Math.PI * 2);
        ctx.fillStyle = ap.color;
        ctx.globalAlpha = twinkleAlpha;
        ctx.fill();
      }

      // 2. Update, fade, and draw dynamic trail particles
      for (let i = dynamicParticles.length - 1; i >= 0; i--) {
        const dp = dynamicParticles[i];
        
        // Gravitational attraction toward mouse
        if (isMouseActive) {
          const dx = mouseX - dp.x;
          const dy = mouseY - dp.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 220) {
            const pull = (1 - dist / 220) * 0.18;
            dp.vx += (dx / dist) * pull;
            dp.vy += (dy / dist) * pull;
          }
        }

        dp.x += dp.vx;
        dp.y += dp.vy;
        
        dp.vx *= 0.96;
        dp.vy *= 0.96;
        
        dp.life--;

        if (dp.life <= 0) {
          dynamicParticles.splice(i, 1);
          continue;
        }

        const alpha = dp.life / dp.maxLife;

        ctx.beginPath();
        ctx.arc(dp.x, dp.y, dp.size * alpha, 0, Math.PI * 2);
        ctx.fillStyle = dp.color;
        ctx.globalAlpha = alpha * 0.85;
        
        // Soft neon glow effect for larger dynamic stars
        if (dp.size > 3.5) {
          ctx.shadowBlur = 12;
          ctx.shadowColor = dp.color;
        }
        ctx.fill();
        ctx.shadowBlur = 0; // reset shadow
      }

      // Combine both particle arrays for connection rendering
      const allParticles = [...ambientParticles, ...dynamicParticles];

      // 3. Draw linear gradient connecting lines (Constellation web)
      for (let i = 0; i < allParticles.length; i++) {
        const p1 = allParticles[i];
        const a1 = p1.life !== undefined ? p1.life / p1.maxLife : 0.6;

        // Connect particles to each other
        for (let j = i + 1; j < allParticles.length; j++) {
          const p2 = allParticles[j];
          const a2 = p2.life !== undefined ? p2.life / p2.maxLife : 0.6;
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 95) {
            const lineAlpha = (1 - dist / 95) * 0.10 * Math.min(a1, a2);
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            
            // Draw connection using a linear gradient between the two particle colors
            const grad = ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
            grad.addColorStop(0, p1.color);
            grad.addColorStop(1, p2.color);
            ctx.strokeStyle = grad;
            
            ctx.globalAlpha = lineAlpha;
            ctx.lineWidth = 0.65;
            ctx.stroke();
          }
        }

        // Connect nearby particles to cursor center (when mouse is active)
        if (isMouseActive) {
          const dx = p1.x - mouseX;
          const dy = p1.y - mouseY;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 140) {
            const lineAlpha = (1 - dist / 140) * 0.15 * a1;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(mouseX, mouseY);
            
            const grad = ctx.createLinearGradient(p1.x, p1.y, mouseX, mouseY);
            grad.addColorStop(0, p1.color);
            grad.addColorStop(1, "#ffffff"); // Fades smoothly to white core
            ctx.strokeStyle = grad;

            ctx.globalAlpha = lineAlpha;
            ctx.lineWidth = 0.85;
            ctx.stroke();
          }
        }
      }

      ctx.globalAlpha = 1.0; // Reset canvas opacity
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

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

  const handleForgotInfo = (type) => {
    alert(`Please check your server config file at /opt/aether-panel/config.json to retrieve or reset your administrator ${type}.`);
  };

  return (
    <div 
      className="min-h-screen text-slate-100 flex items-center justify-center p-6 relative overflow-hidden selection:bg-indigo-600 selection:text-white"
      style={{ fontFamily: "'Poppins', sans-serif" }}
    >
      {/* Dynamic Webuzo-like Orbit Trail Canvas */}
      <canvas id="login-canvas" className="absolute inset-0 w-full h-full z-0" />

      {/* Decorative Radial Lighting */}
      <div className="absolute top-[35%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-indigo-500/10 rounded-full blur-[140px] pointer-events-none z-0" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[350px] h-[350px] bg-purple-500/5 rounded-full blur-[100px] pointer-events-none z-0" />

      {/* Login Box */}
      <div className="w-full max-w-[450px] backdrop-blur-3xl bg-slate-950/60 border border-slate-800/80 rounded-2xl shadow-[0_30px_70px_rgba(0,0,0,0.7)] p-8 md:p-10 relative z-10 animate-fadeIn transition-all duration-300 hover:border-slate-700/60">
        
        {/* Glow Effect Top Border */}
        <div className="absolute top-0 left-8 right-8 h-[1px] bg-gradient-to-r from-transparent via-indigo-500/80 to-transparent" />

        {/* Branding Logo */}
        <div className="flex flex-col items-center justify-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center font-extrabold text-white text-2xl tracking-wider mb-4 shadow-[0_0_35px_rgba(79,70,229,0.35)] relative group">
            AP
            <span className="absolute inset-0 rounded-2xl border border-white/20 scale-95 transition-transform duration-300 group-hover:scale-105" />
          </div>
          <h2 className="text-2xl font-bold text-slate-100 tracking-tight bg-gradient-to-b from-white to-slate-300 bg-clip-text text-transparent">
            Aether Panel
          </h2>
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1.5">
            Cloud Infrastructure Suite
          </span>
        </div>

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Username Field */}
          <div className="space-y-1.5">
            <label className="text-xs text-slate-300 font-semibold tracking-wide block">
              Username
            </label>
            <div className="relative group">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </span>
              <input
                required
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter Username or Email"
                className="w-full bg-[#070911]/90 border border-slate-800/80 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/80 focus:ring-2 focus:ring-indigo-500/10 transition-all duration-200 placeholder:text-slate-700 hover:border-slate-800"
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="space-y-1.5">
            <label className="text-xs text-slate-300 font-semibold tracking-wide block">
              Password
            </label>
            <div className="relative group">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </span>
              <input
                required
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter Password"
                className="w-full bg-[#070911]/90 border border-slate-800/80 rounded-xl pl-10 pr-10 py-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/80 focus:ring-2 focus:ring-indigo-500/10 transition-all duration-200 placeholder:text-slate-700 hover:border-slate-800"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-600 hover:text-slate-400 transition-colors focus:outline-none"
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Remember Me */}
          <div className="flex items-center justify-between text-xs">
            <label className="flex items-center space-x-2 text-slate-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-slate-800 bg-[#070911] text-indigo-600 focus:ring-0 focus:ring-offset-0 transition cursor-pointer"
              />
              <span className="hover:text-slate-300 transition-colors">Remember this session</span>
            </label>
          </div>

          {/* Error Message */}
          {error && (
            <div className="text-xs p-3.5 rounded-xl border border-rose-900/40 bg-rose-950/20 text-rose-400 flex items-start space-x-2.5 animate-fadeIn">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4.5 h-4.5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl font-bold bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white transition-all duration-300 text-sm disabled:opacity-55 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-[0_4px_25px_rgba(79,70,229,0.25)] hover:shadow-[0_4px_30px_rgba(79,70,229,0.45)] transform active:scale-[0.98]"
          >
            {loading ? (
              <span className="flex items-center space-x-2">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Verifying Credentials...</span>
              </span>
            ) : (
              <span>Sign In</span>
            )}
          </button>
        </form>

        {/* Forgot links footer */}
        <div className="flex items-center justify-between text-xs mt-6 pt-2 text-slate-400 font-medium">
          <button 
            type="button" 
            onClick={() => handleForgotInfo('Password')}
            className="hover:text-indigo-400 transition-colors"
          >
            Forgot Password?
          </button>
          <button 
            type="button" 
            onClick={() => handleForgotInfo('Username')}
            className="hover:text-indigo-400 transition-colors"
          >
            Forgot Username?
          </button>
        </div>

        {/* Footer info & SSL shield badge */}
        <div className="mt-8 pt-6 border-t border-slate-900/60 flex items-center justify-between text-[10px] text-slate-600 font-bold tracking-wider uppercase">
          <div>Aether Panel v3.2</div>
          <div className="flex items-center space-x-1 text-emerald-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span>SSL Session Secured</span>
          </div>
        </div>
      </div>
    </div>
  );
}
