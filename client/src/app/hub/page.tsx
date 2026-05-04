'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

function TopNav({ active }: { active: string }) {
  const router = useRouter();
  const links = [{ id: 'arena', label: 'Arena', path: '/' }, { id: 'rankings', label: 'Rankings', path: '/leaderboard' }, { id: 'career', label: 'Career', path: '/career' }, { id: 'hub', label: 'Hub', path: '/hub' }];
  return (
    <header style={{ position: 'fixed', top: 0, width: '100%', zIndex: 50, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 32px', height: 80, background: 'rgba(14,14,16,0.60)', backdropFilter: 'blur(40px)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.03em', color: '#A7A9CC', fontStyle: 'italic', cursor: 'pointer' }} onClick={() => router.push('/')}>Clashvers</div>
      <nav style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
        {links.map(link => { const isActive = active === link.id; return (<a key={link.id} onClick={() => router.push(link.path)} style={{ letterSpacing: '-0.01em', fontWeight: 500, cursor: 'pointer', textDecoration: 'none', color: isActive ? 'var(--primary)' : 'var(--on-surface-variant)', background: isActive ? 'rgba(167,169,204,0.1)' : 'transparent', padding: isActive ? '8px 16px' : '8px 0', borderRadius: isActive ? 9999 : 0 }} onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = 'var(--on-surface)'; }} onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = 'var(--on-surface-variant)'; }}>{link.label}</a>); })}
      </nav>
      <button onClick={() => router.push('/')} style={{ padding: '10px 24px', background: 'var(--primary)', color: 'var(--on-primary)', fontSize: 14, fontWeight: 600, border: 'none', borderRadius: 10, cursor: 'pointer' }}>Battle Now</button>
    </header>
  );
}

export default function HubPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'root' | 'create' | 'join'>('root');
  const [newCommName, setNewCommName] = useState('');
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [communities, setCommunities] = useState<any[]>([]);
  const [selectedComm, setSelectedComm] = useState<any>(null);
  const [credentialInput, setCredentialInput] = useState('');
  const API_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

  useEffect(() => {
    const uid = localStorage.getItem('cw_userId');
    if (uid) setUserId(uid);
    else setError('You must log in first.');
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!userId || !newCommName.trim()) return;
    setLoading(true); setError('');
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = ''; for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
    try {
      const res = await fetch(`${API_URL}/api/nodes/create`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, code, name: newCommName.trim() }) });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed'); setLoading(false); return; }
      setGeneratedCode(code); setLoading(false);
    } catch { setError('Server unreachable'); setLoading(false); }
  }

  async function fetchCommunities(uid: string) {
    setLoading(true);
    try { const res = await fetch(`${API_URL}/api/nodes?userId=${uid}`); const data = await res.json(); if (res.ok) setCommunities(data); } catch { }
    setLoading(false);
  }

  useEffect(() => {
    if (mode === 'join' && userId) { fetchCommunities(userId); setSelectedComm(null); setCredentialInput(''); setError(''); }
    else if (mode === 'create') { setNewCommName(''); setGeneratedCode(null); setError(''); }
  }, [mode]);

  async function handleJoinSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId || !credentialInput.trim()) return;
    setLoading(true); setError('');
    const cleanCode = credentialInput.trim().toUpperCase();
    try {
      const res = await fetch(`${API_URL}/api/nodes/join`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, code: cleanCode }) });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Invalid credential'); setLoading(false); return; }
      router.push(`/hub/${cleanCode}`);
    } catch { setError('Server unreachable'); setLoading(false); }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '14px 18px',
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 12, color: 'var(--on-surface)',
    fontFamily: 'var(--font-sans)', fontSize: 15, outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--background)', overflow: 'auto' }}>
      <TopNav active="hub" />
      <div className="grid-bg" style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }} />

      <main style={{ paddingTop: 120, paddingBottom: 80, paddingLeft: 32, paddingRight: 32, maxWidth: 900, margin: '0 auto', position: 'relative', zIndex: 1 }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--secondary)', letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: 16 }}>◈ ALLIANCE NETWORK</div>
          <h1 style={{ fontSize: 64, fontWeight: 800, letterSpacing: '-0.04em', color: 'var(--on-surface)', lineHeight: 1, fontStyle: 'italic', marginBottom: 16 }}>Alliance Hub</h1>
          <p style={{ fontSize: 16, color: 'var(--on-surface-variant)' }}>Create or join a community node to coordinate with your team.</p>
        </div>

        {!userId ? (
          <div className="glass-panel" style={{ borderRadius: 24, padding: '48px', textAlign: 'center' }}>
            <p style={{ color: 'var(--on-surface-variant)', marginBottom: 24 }}>You must be logged in to access the Alliance Hub.</p>
            <button onClick={() => router.push('/')} style={{ padding: '14px 36px', background: 'var(--primary)', color: 'var(--on-primary)', fontSize: 15, fontWeight: 600, border: 'none', borderRadius: 12, cursor: 'pointer' }}>Login to Arena</button>
          </div>
        ) : mode === 'root' ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {[
              { mode: 'create' as const, icon: 'add_circle', title: 'Create Node', desc: 'Initialize a new community node and generate a credential code to invite your allies.', cta: 'Create Alliance', accent: 'var(--tertiary)' },
              { mode: 'join' as const, icon: 'sensor_occupied', title: 'Join Network', desc: 'Enter a credential code to join an existing alliance or browse the public directory.', cta: 'Browse Alliances', accent: 'var(--primary)' },
            ].map(card => (
              <div key={card.mode} className="glass-panel" style={{ borderRadius: 24, padding: '40px', display: 'flex', flexDirection: 'column', gap: 16, cursor: 'pointer', transition: 'background 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: `rgba(167,169,204,0.1)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 24, color: card.accent }}>{card.icon}</span>
                </div>
                <h3 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--on-surface)' }}>{card.title}</h3>
                <p style={{ fontSize: 14, color: 'var(--on-surface-variant)', lineHeight: 1.6 }}>{card.desc}</p>
                <button onClick={() => setMode(card.mode)} style={{ marginTop: 8, padding: '14px 24px', background: 'var(--primary)', color: 'var(--on-primary)', fontSize: 14, fontWeight: 600, border: 'none', borderRadius: 10, cursor: 'pointer', alignSelf: 'flex-start' }}>
                  {card.cta} →
                </button>
              </div>
            ))}
          </div>

        ) : mode === 'create' ? (
          <div style={{ maxWidth: 540, margin: '0 auto' }}>
            <button onClick={() => setMode('root')} style={{ marginBottom: 24, background: 'none', border: 'none', color: 'var(--on-surface-variant)', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>← Back</button>
            {!generatedCode ? (
              <div className="glass-panel" style={{ borderRadius: 24, padding: '40px 36px' }}>
                <h2 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--on-surface)', marginBottom: 24 }}>Initialize Node</h2>
                <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--on-surface-variant)', marginBottom: 8 }}>Community Name</label>
                    <input type="text" maxLength={30} required placeholder="e.g. ALPHA SQUAD" value={newCommName} onChange={e => setNewCommName(e.target.value)} disabled={loading} style={inputStyle}
                      onFocus={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 1px var(--primary)'; }}
                      onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none'; }} />
                  </div>
                  {error && <div style={{ fontSize: 13, color: 'var(--error)', background: 'rgba(255,180,171,0.08)', border: '1px solid rgba(255,180,171,0.2)', borderRadius: 10, padding: '10px 14px' }}>{error}</div>}
                  <button type="submit" disabled={loading || !newCommName.trim()} style={{ padding: '15px', background: 'var(--primary)', color: 'var(--on-primary)', fontSize: 15, fontWeight: 600, border: 'none', borderRadius: 12, cursor: 'pointer', opacity: loading || !newCommName.trim() ? 0.5 : 1 }}>
                    {loading ? 'Creating...' : 'Initialize Node'}
                  </button>
                </form>
              </div>
            ) : (
              <div className="glass-panel" style={{ borderRadius: 24, padding: '40px 36px', textAlign: 'center' }}>
                <div style={{ fontSize: 40, marginBottom: 16 }}>✅</div>
                <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--on-surface)', marginBottom: 8 }}>Node Secured</h2>
                <p style={{ fontSize: 14, color: 'var(--on-surface-variant)', marginBottom: 32 }}>Share this credential with your allies to grant access.</p>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 36, fontWeight: 700, letterSpacing: '0.2em', color: 'var(--on-surface)', padding: '24px', background: 'rgba(255,255,255,0.04)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.1)', marginBottom: 24 }}>
                  {generatedCode}
                </div>
                <button onClick={() => router.push(`/hub/${generatedCode}`)} style={{ padding: '15px 40px', background: 'var(--primary)', color: 'var(--on-primary)', fontSize: 15, fontWeight: 600, border: 'none', borderRadius: 12, cursor: 'pointer' }}>
                  Enter Command Center →
                </button>
              </div>
            )}
          </div>

        ) : (
          /* Join */
          <div style={{ maxWidth: 700, margin: '0 auto' }}>
            <button onClick={() => setMode('root')} style={{ marginBottom: 24, background: 'none', border: 'none', color: 'var(--on-surface-variant)', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>← Back</button>
            {!selectedComm ? (
              <>
                <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--on-surface)', marginBottom: 24, letterSpacing: '-0.02em' }}>Public Directory</h2>
                {loading ? (
                  <div style={{ textAlign: 'center', padding: 40, color: 'var(--secondary)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>SCANNING NETWORK...</div>
                ) : communities.length === 0 ? (
                  <div className="glass-panel" style={{ borderRadius: 20, padding: '60px', textAlign: 'center', color: 'var(--secondary)', fontFamily: 'var(--font-mono)', fontSize: 13 }}>No public nodes found.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {communities.map(comm => (
                      <div key={comm.id} className="glass-panel" style={{ borderRadius: 16, padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'background 0.15s', cursor: 'default' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}>
                        <div>
                          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--on-surface)', letterSpacing: '-0.01em' }}>{comm.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--secondary)', fontFamily: 'var(--font-mono)', marginTop: 4 }}>INIT: {new Date(comm.created_at).toLocaleDateString()}</div>
                        </div>
                        <button onClick={() => comm.isMember && comm.code ? router.push(`/hub/${comm.code}`) : setSelectedComm(comm)}
                          style={{ padding: '10px 20px', background: comm.isMember ? 'rgba(74,222,128,0.1)' : 'var(--primary)', color: comm.isMember ? '#4ade80' : 'var(--on-primary)', fontSize: 13, fontWeight: 600, border: comm.isMember ? '1px solid rgba(74,222,128,0.3)' : 'none', borderRadius: 10, cursor: 'pointer' }}>
                          {comm.isMember ? 'Enter →' : 'Request Access'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div style={{ maxWidth: 480, margin: '0 auto' }}>
                <button onClick={() => setSelectedComm(null)} style={{ marginBottom: 24, background: 'none', border: 'none', color: 'var(--on-surface-variant)', cursor: 'pointer', fontSize: 14 }}>← Back to Directory</button>
                <div className="glass-panel" style={{ borderRadius: 24, padding: '40px 36px' }}>
                  <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--on-surface)', marginBottom: 6 }}>Join: {selectedComm.name}</h2>
                  <p style={{ fontSize: 14, color: 'var(--on-surface-variant)', marginBottom: 28 }}>Enter the 8-character credential code provided by the node administrator.</p>
                  <form onSubmit={handleJoinSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <input type="text" maxLength={8} placeholder="Credential Code" value={credentialInput} onChange={e => setCredentialInput(e.target.value.toUpperCase())} disabled={loading}
                      style={{ ...inputStyle, textAlign: 'center', fontSize: 22, fontFamily: 'var(--font-mono)', letterSpacing: '0.3em', fontWeight: 700 }}
                      onFocus={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 1px var(--primary)'; }}
                      onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none'; }} />
                    {error && <div style={{ fontSize: 13, color: 'var(--error)', background: 'rgba(255,180,171,0.08)', border: '1px solid rgba(255,180,171,0.2)', borderRadius: 10, padding: '10px 14px' }}>{error}</div>}
                    <button type="submit" disabled={loading || credentialInput.length !== 8} style={{ padding: '15px', background: 'var(--primary)', color: 'var(--on-primary)', fontSize: 15, fontWeight: 600, border: 'none', borderRadius: 12, cursor: 'pointer', opacity: loading || credentialInput.length !== 8 ? 0.5 : 1 }}>
                      {loading ? 'Verifying...' : 'Enter Alliance →'}
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
