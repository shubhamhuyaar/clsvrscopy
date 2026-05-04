'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface PlayerProfile { id: string; username: string; elo: number; wins: number; losses: number; }
interface MatchHistory { id: string; player1_username: string | null; player2_username: string | null; player1_id: string | null; player2_id: string | null; winner: string | null; elo_change_p1: number | null; elo_change_p2: number | null; problem_title: string | null; created_at: string | null; ended_at: string | null; }

const timeAgo = (d: string) => { const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000); if (s < 60) return 'just now'; const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`; const h = Math.floor(m / 60); return h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`; };

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

export default function CareerPage() {
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [matches, setMatches] = useState<MatchHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const uid = localStorage.getItem('cw_userId');
    if (!uid) { setError('No session'); setLoading(false); return; }
    setUserId(uid);
    const API_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';
    Promise.all([fetch(`${API_URL}/profile/${uid}`, { cache: 'no-store' }), fetch(`${API_URL}/matches/${uid}`, { cache: 'no-store' })])
      .then(async ([rP, rM]) => { if (!rP.ok) throw new Error('Failed to load profile'); setProfile(await rP.json()); if (rM.ok) setMatches(await rM.json()); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  const getResult = (m: MatchHistory) => {
    if (!m.winner || m.winner === 'draw') return { label: 'DRAW', color: 'var(--tertiary)', chip: 'rgba(220,197,145,0.12)' };
    const amP1 = m.player1_id === userId, amP2 = m.player2_id === userId;
    if ((m.winner === 'player1' && amP1) || (m.winner === 'player2' && amP2)) return { label: 'VICTORY', color: '#4ade80', chip: 'rgba(74,222,128,0.1)' };
    return { label: 'DEFEAT', color: 'var(--error)', chip: 'rgba(255,180,171,0.1)' };
  };

  const getOpponent = (m: MatchHistory) => (m.player1_username === profile?.username ? m.player2_username : m.player1_username) || 'Unknown';

  const total = profile ? profile.wins + profile.losses : 0;
  const wr = total > 0 ? ((profile!.wins / total) * 100).toFixed(1) : '0.0';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--background)', overflow: 'auto' }}>
      <TopNav active="career" />
      <div className="grid-bg" style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'fixed', top: '30%', right: '10%', width: 500, height: 500, background: 'radial-gradient(circle, rgba(167,169,204,0.04) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />

      <main style={{ paddingTop: 120, paddingBottom: 80, paddingLeft: 32, paddingRight: 32, maxWidth: 1280, margin: '0 auto', position: 'relative', zIndex: 1 }}>

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, paddingTop: 160 }}>
            <div style={{ width: 32, height: 32, border: '2px solid rgba(167,169,204,0.2)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <span style={{ color: 'var(--on-surface-variant)', fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '0.1em' }}>LOADING...</span>
          </div>
        ) : error ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 120 }}>
            <div className="glass-panel" style={{ borderRadius: 24, padding: '48px 40px', textAlign: 'center', maxWidth: 440 }}>
              <div style={{ fontSize: 56, marginBottom: 20 }}>🔐</div>
              <h2 style={{ fontSize: 24, fontWeight: 700, color: 'var(--on-surface)', letterSpacing: '-0.02em', marginBottom: 12 }}>Access Denied</h2>
              <p style={{ fontSize: 14, color: 'var(--on-surface-variant)', lineHeight: 1.6, marginBottom: 28 }}>
                {error.includes('No session') ? 'You must log in before viewing your career stats.' : error}
              </p>
              <button onClick={() => router.push('/')} style={{ padding: '14px 36px', background: 'var(--primary)', color: 'var(--on-primary)', fontFamily: 'var(--font-sans)', fontSize: 15, fontWeight: 600, border: 'none', borderRadius: 12, cursor: 'pointer' }}>
                Back to Arena
              </button>
            </div>
          </div>
        ) : profile && (
          <>
            {/* ── Profile hero ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>
              {/* Identity card */}
              <div className="glass-panel" style={{ borderRadius: 24, padding: '36px', display: 'flex', alignItems: 'center', gap: 24 }}>
                <div style={{ width: 88, height: 88, borderRadius: '50%', background: 'rgba(167,169,204,0.1)', border: '2px solid rgba(167,169,204,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, flexShrink: 0 }}>
                  👤
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--secondary)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 6 }}>Combat Identity</div>
                  <h1 style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--on-surface)', marginBottom: 6 }}>{profile.username}</h1>
                  <div style={{ fontSize: 12, color: 'var(--secondary)', fontFamily: 'var(--font-mono)' }}>
                    {total >= 100 ? 'Elite Guard' : total >= 20 ? 'Veteran Clashver' : 'Recruit'}
                  </div>
                </div>
              </div>

              {/* Rating card */}
              <div className="glass-panel" style={{ borderRadius: 24, padding: '36px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--secondary)', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 10 }}>Combat Rating</div>
                <div style={{ fontSize: 64, fontWeight: 800, letterSpacing: '-0.04em', color: 'var(--primary)', lineHeight: 1, marginBottom: 16 }}>{profile.elo.toLocaleString()}</div>
                <div style={{ display: 'flex', gap: 24 }}>
                  <div>
                    <span style={{ fontSize: 22, fontWeight: 700, color: '#4ade80' }}>{profile.wins}</span>
                    <span style={{ fontSize: 12, color: 'var(--secondary)', marginLeft: 4, fontFamily: 'var(--font-mono)' }}>W</span>
                  </div>
                  <div style={{ color: 'var(--secondary)' }}>—</div>
                  <div>
                    <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--error)' }}>{profile.losses}</span>
                    <span style={{ fontSize: 12, color: 'var(--secondary)', marginLeft: 4, fontFamily: 'var(--font-mono)' }}>L</span>
                  </div>
                  <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                    <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--on-surface)' }}>{wr}%</div>
                    <div style={{ fontSize: 10, color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Win Rate</div>
                  </div>
                </div>
                {/* Win rate bar */}
                <div style={{ marginTop: 16, height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ width: `${wr}%`, height: '100%', background: 'var(--primary)', transition: 'width 0.6s ease' }} />
                </div>
              </div>
            </div>

            {/* ── Match history table ── */}
            <section className="glass-panel" style={{ borderRadius: 24, overflow: 'hidden' }}>
              {/* Table header */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 4fr 3fr 1fr 2fr', padding: '20px 32px', borderBottom: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)' }}>
                {['Result', 'Problem', 'Opponent', 'Δ ELO', 'When'].map((h, i) => (
                  <div key={h} style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--secondary)', fontWeight: 700, textAlign: i >= 3 ? 'center' : 'left' }}>{h}</div>
                ))}
              </div>

              {matches.length === 0 ? (
                <div style={{ padding: '80px', textAlign: 'center', color: 'var(--secondary)', fontFamily: 'var(--font-mono)', fontSize: 13 }}>No battles recorded yet. Enter the arena!</div>
              ) : (
                matches.map(m => {
                  const result = getResult(m);
                  const opponent = getOpponent(m);
                  const isP1 = m.player1_username === profile.username;
                  const delta = isP1 ? m.elo_change_p1 : m.elo_change_p2;
                  return (
                    <div key={m.id} style={{ display: 'grid', gridTemplateColumns: '1fr 4fr 3fr 1fr 2fr', padding: '18px 32px', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.1s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <div>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '4px 10px', borderRadius: 9999, color: result.color, background: result.chip, letterSpacing: '0.06em' }}>
                          {result.label}
                        </span>
                      </div>
                      <div style={{ fontWeight: 500, color: 'var(--on-surface)', fontSize: 14, letterSpacing: '-0.01em' }}>{m.problem_title || '—'}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(116,118,143,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>⚔</div>
                        <span style={{ fontSize: 14, color: 'var(--on-surface-variant)' }}>{opponent}</span>
                      </div>
                      <div style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 700, color: delta && delta > 0 ? '#4ade80' : delta && delta < 0 ? 'var(--error)' : 'var(--secondary)' }}>
                        {delta && delta !== 0 ? `${delta > 0 ? '+' : ''}${delta}` : '—'}
                      </div>
                      <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--secondary)', fontFamily: 'var(--font-mono)' }}>
                        {m.ended_at ? timeAgo(m.ended_at) : m.created_at ? timeAgo(m.created_at) : '—'}
                      </div>
                    </div>
                  );
                })
              )}
            </section>
          </>
        )}
      </main>

      <footer style={{ padding: '24px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(15,15,16,0.2)', backdropFilter: 'blur(20px)', borderTop: '1px solid rgba(255,255,255,0.05)', position: 'relative', zIndex: 1 }}>
        <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--secondary)' }}>© 2024 CLASHVERS. PROTOCOL INITIATED.</div>
        <div style={{ display: 'flex', gap: 32 }}>{['Privacy Grid', 'Terms of Combat', 'API Access', 'Neural Link'].map(l => (<a key={l} href="#" style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--outline)', textDecoration: 'none', letterSpacing: '0.08em' }}>{l}</a>))}</div>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(116,118,143,0.5)', fontFamily: 'var(--font-mono)' }}>CLASHV.SYS</div>
      </footer>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
