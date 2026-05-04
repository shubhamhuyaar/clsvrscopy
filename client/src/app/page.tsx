'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

/* ── Shared top nav bar — exact Stitch layout ── */
export function TopNav({ active }: { active: string }) {
  const router = useRouter();
  const links = [
    { id: 'arena', label: 'Arena', path: '/' },
    { id: 'rankings', label: 'Rankings', path: '/leaderboard' },
    { id: 'career', label: 'Career', path: '/career' },
    { id: 'hub', label: 'Hub', path: '/hub' },
  ];
  return (
    <header style={{
      position: 'fixed', top: 0, width: '100%', zIndex: 50,
      display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center',
      padding: '0 32px', minHeight: 80,
      background: 'rgba(14,14,16,0.60)',
      backdropFilter: 'blur(40px)',
      borderBottom: '1px solid rgba(255,255,255,0.05)',
    }}>
      {/* Logo */}
      <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.03em', color: '#A7A9CC', fontStyle: 'italic', cursor: 'pointer' }}
        onClick={() => router.push('/')}>
        Clashvers
      </div>

      {/* Nav links */}
      <nav style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '16px 32px', height: '100%' }}>
        {links.map(link => {
          const isActive = active === link.id;
          return (
            <a key={link.id} onClick={() => router.push(link.path)}
              style={{
                fontFamily: 'var(--font-sans)', letterSpacing: '-0.01em', fontWeight: 500,
                cursor: 'pointer', textDecoration: 'none',
                color: isActive ? 'var(--primary)' : 'var(--on-surface-variant)',
                background: isActive ? 'rgba(167,169,204,0.1)' : 'transparent',
                padding: isActive ? '8px 16px' : '8px 0',
                borderRadius: isActive ? 9999 : 0,
                transition: 'color 0.15s',
              }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = 'var(--on-surface)'; }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = 'var(--on-surface-variant)'; }}
            >{link.label}</a>
          );
        })}
      </nav>

      {/* Right actions — filled by page */}
      <div id="nav-right" style={{ display: 'flex', alignItems: 'center', gap: 24 }} />
    </header>
  );
}

/* ── Home Page ── */
export default function HomePage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [userId, setUserId] = useState<string | null>(null);
  const [loggedUsername, setLoggedUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [finding, setFinding] = useState(false);
  const [error, setError] = useState('');
  const [playerStats, setPlayerStats] = useState<{ elo: number; wins: number; losses: number } | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

  useEffect(() => {
    const savedId = localStorage.getItem('cw_userId');
    const savedName = localStorage.getItem('cw_username');
    if (savedId && savedName) { setUserId(savedId); setLoggedUsername(savedName); fetchStats(savedId); }
  }, []);

  async function fetchStats(uid: string) {
    try { const r = await fetch(`${API_URL}/profile/${uid}`, { cache: 'no-store' }); if (r.ok) setPlayerStats(await r.json()); } catch { }
  }

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault(); setError('');
    if (!username.trim() || !password.trim()) { setError('Username and password required.'); return; }
    setLoading(true);
    try {
      const endpoint = authMode === 'login' ? '/auth/login' : '/auth/register';
      const res = await fetch(`${API_URL}${endpoint}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: username.trim(), password: password.trim() }) });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Authentication failed'); setLoading(false); return; }
      localStorage.setItem('cw_userId', data.userId);
      localStorage.setItem('cw_username', data.username);
      setUserId(data.userId); setLoggedUsername(data.username);
      setPlayerStats({ elo: data.elo || 1000, wins: 0, losses: 0 });
      fetchStats(data.userId); setLoading(false);
    } catch { setError('Cannot connect to server.'); setLoading(false); }
  }

  function handleLogout() {
    localStorage.removeItem('cw_userId'); localStorage.removeItem('cw_username');
    setUserId(null); setPlayerStats(null); setUsername(''); setPassword(''); setLoggedUsername('');
  }

  async function handleFindMatch() {
    setFinding(true); setError('');
    try {
      const res = await fetch(`${API_URL}/room/create`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, username: loggedUsername }), cache: 'no-store' });
      const data = await res.json();
      if (data.roomId) router.push(`/battle/${data.roomId}`);
      else { setError('Server error — try again'); setFinding(false); }
    } catch { setError('Cannot reach server'); setFinding(false); }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '14px 18px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 12, color: 'var(--on-surface)',
    fontFamily: 'var(--font-sans)', fontSize: 15, outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  };

  return (
    <div style={{ height: '100vh', overflow: 'auto', background: 'var(--background)' }}>
      <TopNav active="arena" />

      {/* Grid BG */}
      <div className="grid-bg" style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }} />

      {/* Radial glows */}
      <div style={{ position: 'fixed', top: '30%', left: '25%', width: 600, height: 600, background: 'radial-gradient(circle, rgba(167,169,204,0.06) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'fixed', top: '10%', right: '10%', width: 400, height: 400, background: 'radial-gradient(circle, rgba(220,197,145,0.04) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />

      {/* ── HERO ── */}
      {!userId ? (
        <main style={{ paddingTop: 160, paddingBottom: 120, paddingLeft: 32, paddingRight: 32, maxWidth: 1280, margin: '0 auto', position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 80 }}>

          {/* Hero text */}
          <section style={{ textAlign: 'center', maxWidth: 900 }}>
            <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--primary)', letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: 24 }}>
              ◈ COMBAT PROTOCOL ACTIVE
            </div>
            <h1 style={{ fontSize: 'clamp(56px, 8vw, 96px)', fontWeight: 800, lineHeight: 1.0, letterSpacing: '-0.03em', color: 'var(--on-surface)', marginBottom: 28, fontFamily: 'var(--font-sans)' }}>
              Experience the<br />
              <span style={{ color: 'var(--primary)', fontStyle: 'italic' }}>next evolution</span><br />
              of tactical combat.
            </h1>
            <p style={{ fontSize: 18, color: 'var(--on-surface-variant)', lineHeight: 1.7, maxWidth: 600, margin: '0 auto 48px' }}>
              Forge alliances, master forbidden algorithms, and ascend the cosmic ranks in real-time 1v1 coding duels.
            </p>
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={() => document.getElementById('auth-card')?.scrollIntoView({ behavior: 'smooth' })}
                style={{ padding: '16px 40px', background: 'var(--primary)', color: 'var(--on-primary)', fontFamily: 'var(--font-sans)', fontSize: 15, fontWeight: 600, border: 'none', borderRadius: 12, cursor: 'pointer', letterSpacing: '-0.01em' }}>
                Enter the Arena →
              </button>
              <button onClick={() => router.push('/leaderboard')}
                style={{ padding: '16px 40px', background: 'transparent', color: 'var(--on-surface-variant)', fontFamily: 'var(--font-sans)', fontSize: 15, fontWeight: 500, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, cursor: 'pointer' }}>
                View Rankings
              </button>
            </div>
          </section>

          {/* Feature grid */}
          <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, width: '100%' }}>
            {[
              { icon: 'science', title: 'Laboratory Alpha', desc: 'Synthesize algorithms and mod your code arsenal using rare problem sets harvested from live duels.' },
              { icon: 'leaderboard', title: 'Global Rankings', desc: 'Compete against the world\'s best. Claim seasonal rewards and the ultimate title of Arena Champion.' },
              { icon: 'groups', title: 'Join the Alliance', desc: 'Coordinate with your team in real-time. Share resources, strategize, and conquer entire sectors together.' },
            ].map(card => (
              <div key={card.title} className="glass-panel" style={{ borderRadius: 20, padding: '28px 24px' }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(167,169,204,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 22, color: 'var(--primary)' }}>{card.icon}</span>
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--on-surface)', marginBottom: 10, letterSpacing: '-0.01em' }}>{card.title}</h3>
                <p style={{ fontSize: 14, color: 'var(--on-surface-variant)', lineHeight: 1.6 }}>{card.desc}</p>
              </div>
            ))}
          </section>

          {/* Auth card */}
          <section id="auth-card" className="glass-panel" style={{ width: '100%', maxWidth: 480, borderRadius: 24, padding: '40px 36px', scrollMarginTop: 100 }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--on-surface)', marginBottom: 6, letterSpacing: '-0.02em', textAlign: 'center' }}>
              {authMode === 'login' ? 'Access Protocol' : 'Create Account'}
            </h2>
            <p style={{ fontSize: 14, color: 'var(--on-surface-variant)', textAlign: 'center', marginBottom: 28 }}>
              {authMode === 'login' ? 'Enter your credentials to begin.' : 'Register a new combat identity.'}
            </p>

            {/* Tab toggle */}
            <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 4, marginBottom: 24 }}>
              {(['login', 'register'] as const).map(mode => (
                <button key={mode} onClick={() => { setAuthMode(mode); setError(''); }}
                  style={{ flex: 1, padding: '10px', fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', borderRadius: 10, transition: 'all 0.15s', background: authMode === mode ? 'var(--primary)' : 'transparent', color: authMode === mode ? 'var(--on-primary)' : 'var(--on-surface-variant)', letterSpacing: '-0.01em' }}>
                  {mode === 'login' ? 'Login' : 'Register'}
                </button>
              ))}
            </div>

            <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--on-surface-variant)', marginBottom: 8 }}>Username</label>
                <input type="text" placeholder="your_handle" value={username} onChange={e => setUsername(e.target.value)} style={inputStyle}
                  onFocus={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 1px var(--primary)'; }}
                  onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none'; }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--on-surface-variant)', marginBottom: 8 }}>Password</label>
                <input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} style={inputStyle}
                  onFocus={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 1px var(--primary)'; }}
                  onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none'; }} />
              </div>
              {error && (
                <div style={{ fontSize: 13, color: 'var(--error)', background: 'rgba(255,180,171,0.08)', border: '1px solid rgba(255,180,171,0.2)', borderRadius: 10, padding: '10px 14px' }}>
                  {error}
                </div>
              )}
              <button type="submit" disabled={loading}
                style={{ width: '100%', padding: '15px', marginTop: 4, background: 'var(--primary)', color: 'var(--on-primary)', fontFamily: 'var(--font-sans)', fontSize: 15, fontWeight: 600, border: 'none', borderRadius: 12, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, letterSpacing: '-0.01em', transition: 'opacity 0.15s' }}>
                {loading ? 'Authenticating...' : authMode === 'login' ? 'Enter the Arena' : 'Create Combat ID'}
              </button>
            </form>
          </section>
        </main>

      ) : (
        /* ── DASHBOARD (logged in) ── */
        <main style={{ paddingTop: 120, paddingBottom: 80, paddingLeft: 32, paddingRight: 32, maxWidth: 1280, margin: '0 auto', position: 'relative', zIndex: 1 }}>

          {/* Welcome + disconnect */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 40 }}>
            <div>
              <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--secondary)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 6 }}>Active Session</div>
              <h1 style={{ fontSize: 52, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--on-surface)' }}>{loggedUsername}</h1>
            </div>
            <button onClick={handleLogout}
              style={{ marginTop: 16, padding: '10px 20px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'var(--on-surface-variant)', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}>
              Disconnect
            </button>
          </div>

          {/* Stat cards */}
          {playerStats && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 40 }}>
              {[
                { label: 'Combat Rating', value: playerStats.elo, color: 'var(--primary)' },
                { label: 'Victories', value: playerStats.wins, color: 'var(--tertiary)' },
                { label: 'Defeats', value: playerStats.losses, color: 'var(--on-surface-variant)' },
              ].map(stat => (
                <div key={stat.label} className="glass-panel" style={{ borderRadius: 20, padding: '24px 28px' }}>
                  <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--secondary)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>{stat.label}</div>
                  <div style={{ fontSize: 48, fontWeight: 800, letterSpacing: '-0.03em', color: stat.color, lineHeight: 1 }}>{stat.value}</div>
                </div>
              ))}
            </div>
          )}

          {/* Battle CTA */}
          <div className="glass-panel" style={{ borderRadius: 24, padding: '48px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, textAlign: 'center', background: 'rgba(167,169,204,0.03)' }}>
            <div style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: 'var(--secondary)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Ready for combat?</div>
            <h2 style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--on-surface)' }}>Find Your Next Battle</h2>
            <p style={{ fontSize: 15, color: 'var(--on-surface-variant)', maxWidth: 440, lineHeight: 1.6 }}>
              Enter the matchmaking queue and face an opponent of equal skill in real-time code combat.
            </p>
            <button onClick={handleFindMatch} disabled={finding}
              style={{ padding: '18px 60px', background: 'var(--primary)', color: 'var(--on-primary)', fontFamily: 'var(--font-sans)', fontSize: 17, fontWeight: 600, border: 'none', borderRadius: 14, cursor: finding ? 'not-allowed' : 'pointer', opacity: finding ? 0.7 : 1, letterSpacing: '-0.01em', marginTop: 8 }}>
              {finding ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 18, height: 18, border: '2px solid rgba(43,46,75,0.3)', borderTopColor: 'var(--on-primary)', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
                  Finding Match...
                </span>
              ) : 'Battle Now →'}
            </button>
            {error && <div style={{ fontSize: 13, color: 'var(--error)' }}>{error}</div>}
          </div>

          {/* Quick nav */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16, marginTop: 24 }}>
            {[
              { label: 'Rankings', desc: 'See where you stand globally', path: '/leaderboard', icon: 'leaderboard' },
              { label: 'Career', desc: 'Your match history & stats', path: '/career', icon: 'person' },
              { label: 'Community', desc: 'Join or create an alliance', path: '/hub', icon: 'groups' },
            ].map(item => (
              <button key={item.label} onClick={() => router.push(item.path)}
                className="glass-panel"
                style={{ borderRadius: 16, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)', textAlign: 'left', transition: 'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 22, color: 'var(--primary)' }}>{item.icon}</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--on-surface)' }}>{item.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--on-surface-variant)' }}>{item.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </main>
      )}

      {/* Footer */}
      <footer style={{ padding: '24px 32px', display: 'flex', flexWrap: 'wrap', gap: 24, justifyContent: 'space-between', alignItems: 'center', background: 'rgba(15,15,16,0.2)', backdropFilter: 'blur(20px)', borderTop: '1px solid rgba(255,255,255,0.05)', position: 'relative', zIndex: 1 }}>
        <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--secondary)' }}>© 2024 CLASHVERS. PROTOCOL INITIATED.</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px 32px' }}>
          {['Privacy Grid', 'Terms of Combat', 'API Access', 'Neural Link'].map(l => (
            <a key={l} href="#" style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--outline)', textDecoration: 'none', letterSpacing: '0.08em' }}>{l}</a>
          ))}
        </div>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(116,118,143,0.5)', fontFamily: 'var(--font-mono)' }}>CLASHV.SYS</div>
      </footer>
    </div>
  );
}
