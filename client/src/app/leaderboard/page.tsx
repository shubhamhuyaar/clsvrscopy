'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Player { id: string; username: string; elo: number; wins: number; losses: number; avatar_url?: string; }

import { TopNav } from '@/components/TopNav';

const PAGE_SIZE = 10;

export default function LeaderboardPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);

  useEffect(() => {
    const API_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';
    fetch(`${API_URL}/leaderboard`, { cache: 'no-store' })
      .then(r => { if (!r.ok) throw new Error('Failed'); return r.json(); })
      .then(d => { setPlayers(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  const totalPages = Math.max(1, Math.ceil(Math.max(0, players.length - 3) / PAGE_SIZE));
  const top3 = players.slice(0, 3);
  const rest = players.slice(3);
  const pageRows = rest.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--background)', overflow: 'auto' }}>
      <TopNav active="rankings" />
      <div className="grid-bg" style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'fixed', top: '20%', left: '50%', transform: 'translateX(-50%)', width: 800, height: 400, background: 'radial-gradient(circle, rgba(220,197,145,0.05) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />

      <main style={{ paddingTop: 128, paddingBottom: 160, paddingLeft: 32, paddingRight: 32, maxWidth: 1280, margin: '0 auto', position: 'relative', zIndex: 1 }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--secondary)', letterSpacing: '0.3em', textTransform: 'uppercase', marginBottom: 16 }}>◈ GLOBAL COMPETITION</div>
          <h1 style={{ fontSize: 72, fontWeight: 800, letterSpacing: '-0.04em', color: 'var(--on-surface)', lineHeight: 1, fontStyle: 'italic' }}>Rankings</h1>
          <p style={{ fontSize: 16, color: 'var(--on-surface-variant)', marginTop: 16 }}>Top players ranked by Combat Rating</p>
        </div>

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, paddingTop: 80 }}>
            <div style={{ width: 32, height: 32, border: '2px solid rgba(167,169,204,0.2)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <span style={{ color: 'var(--on-surface-variant)', fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '0.1em' }}>LOADING...</span>
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--error)', fontFamily: 'var(--font-mono)', fontSize: 13 }}>{error}</div>
        ) : (
          <>
            {/* ── Podium ── exact Stitch pedestal layout */}
            {top3.length > 0 && (
              <div style={{ marginBottom: 96 }}>
                {/* ── Desktop Podium ── */}
                <section className="podium-container hide-on-mobile">
                  {/* Rank 1 — tallest, offset up */}
                  {top3[0] && (
                    <div className="podium-rank-1" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', transform: 'translateY(-32px)' }}>
                      <div style={{ marginBottom: 24, position: 'relative' }}>
                        <div style={{ width: 128, height: 128, borderRadius: '50%', overflow: 'hidden', border: '4px solid var(--tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface)', fontSize: 44 }}>
                          {top3[0].avatar_url ? <img src={top3[0].avatar_url} alt="Rank 1" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '🏆'}
                        </div>
                        <div style={{ position: 'absolute', bottom: -12, right: 8, width: 40, height: 40, borderRadius: '50%', background: 'var(--tertiary)', color: 'var(--on-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 18 }}>1</div>
                      </div>
                      <div className="glass-panel pedestal-glow-gold" style={{ width: 240, height: 320, borderRadius: '40px 40px 0 0', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 40, gap: 6 }}>
                        <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--on-surface)', letterSpacing: '-0.02em' }}>{top3[0].username}</span>
                        <span style={{ fontSize: 16, color: 'var(--tertiary)', fontFamily: 'var(--font-mono)' }}>{top3[0].elo.toLocaleString()} CR</span>
                        <div style={{ marginTop: 12, display: 'flex', gap: 12, fontSize: 12, color: 'var(--on-surface-variant)', fontFamily: 'var(--font-mono)' }}>
                          <span style={{ color: '#4ade80' }}>{top3[0].wins}W</span>
                          <span>—</span>
                          <span style={{ color: 'var(--error)' }}>{top3[0].losses}L</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Rank 2 */}
                  {top3[1] && (
                    <div className="podium-rank-2" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div style={{ marginBottom: 24, position: 'relative' }}>
                        <div style={{ width: 96, height: 96, borderRadius: '50%', overflow: 'hidden', border: '2px solid var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface)', fontSize: 32 }}>
                          {top3[1].avatar_url ? <img src={top3[1].avatar_url} alt="Rank 2" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '🥈'}
                        </div>
                        <div style={{ position: 'absolute', bottom: -8, right: 0, width: 32, height: 32, borderRadius: '50%', background: 'var(--primary)', color: 'var(--on-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14 }}>2</div>
                      </div>
                      <div className="glass-panel pedestal-glow-silver" style={{ width: 192, height: 224, borderRadius: '24px 24px 0 0', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 32, gap: 4 }}>
                        <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--on-surface)', letterSpacing: '-0.01em' }}>{top3[1].username}</span>
                        <span style={{ fontSize: 13, color: 'var(--secondary)', fontFamily: 'var(--font-mono)' }}>{top3[1].elo.toLocaleString()} CR</span>
                      </div>
                    </div>
                  )}

                  {/* Rank 3 */}
                  {top3[2] && (
                    <div className="podium-rank-3" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div style={{ marginBottom: 24, position: 'relative' }}>
                        <div style={{ width: 96, height: 96, borderRadius: '50%', overflow: 'hidden', border: '2px solid var(--tertiary-container)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface)', fontSize: 32 }}>
                          {top3[2].avatar_url ? <img src={top3[2].avatar_url} alt="Rank 3" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '🥉'}
                        </div>
                        <div style={{ position: 'absolute', bottom: -8, right: 0, width: 32, height: 32, borderRadius: '50%', background: 'var(--tertiary-container)', color: 'var(--on-tertiary-container)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14 }}>3</div>
                      </div>
                      <div className="glass-panel pedestal-glow-bronze" style={{ width: 192, height: 176, borderRadius: '24px 24px 0 0', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 32, gap: 4 }}>
                        <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--on-surface)', letterSpacing: '-0.01em' }}>{top3[2].username}</span>
                        <span style={{ fontSize: 13, color: 'var(--tertiary-container)', fontFamily: 'var(--font-mono)' }}>{top3[2].elo.toLocaleString()} CR</span>
                      </div>
                    </div>
                  )}
                </section>

                {/* ── Mobile Top 3 Cards ── */}
                <section className="hide-on-desktop" style={{ flexDirection: 'column', gap: 16, width: '100%', padding: '0 16px' }}>
                  {top3.map((player, index) => {
                    const colors = [
                      { bg: 'rgba(220, 197, 145, 0.08)', border: 'var(--tertiary)', text: 'var(--tertiary)', icon: '🏆' },
                      { bg: 'rgba(194, 196, 232, 0.08)', border: 'var(--primary)', text: 'var(--primary)', icon: '🥈' },
                      { bg: 'rgba(191, 170, 120, 0.08)', border: 'var(--tertiary-container)', text: 'var(--tertiary-container)', icon: '🥉' }
                    ];
                    const color = colors[index];
                    return (
                      <div key={player.id} className="glass-panel" style={{ display: 'flex', alignItems: 'center', padding: 20, borderRadius: 24, gap: 16, borderLeft: `4px solid ${color.border}`, background: color.bg }}>
                         <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--surface)', border: `2px solid ${color.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0, overflow: 'hidden' }}>
                           {player.avatar_url ? <img src={player.avatar_url} alt={player.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : color.icon}
                         </div>
                         <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                           <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--on-surface)', letterSpacing: '-0.01em' }}>{player.username}</span>
                           <span style={{ fontSize: 13, color: color.text, fontFamily: 'var(--font-mono)' }}>{player.elo.toLocaleString()} CR</span>
                         </div>
                         <div style={{ fontSize: 32, fontWeight: 800, color: color.border, opacity: 0.3, fontStyle: 'italic' }}>#{index + 1}</div>
                      </div>
                    );
                  })}
                </section>
              </div>
            )}

            {/* ── Table ── exact Stitch grid layout */}
            <section className="glass-panel" style={{ maxWidth: 900, margin: '0 auto', borderRadius: 24, overflow: 'hidden', boxShadow: '0 25px 50px rgba(0,0,0,0.4)' }}>
              {/* Table header */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', padding: '24px 40px', borderBottom: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)' }}>
                {['Rank', 'Player', 'Win Rate', 'Combat Rating'].map((h, i) => (
                  <div key={h} style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--secondary)', fontWeight: 700, textAlign: i >= 2 ? 'right' : 'left' }}>{h}</div>
                ))}
              </div>

              {players.length === 0 ? (
                <div style={{ padding: '80px', textAlign: 'center', color: 'var(--secondary)', fontFamily: 'var(--font-mono)', fontSize: 13 }}>No ranked players yet.</div>
              ) : (
                pageRows.map((p, idx) => {
                  const globalRank = 3 + page * PAGE_SIZE + idx + 1;
                  const total = p.wins + p.losses;
                  const wr = total > 0 ? ((p.wins / total) * 100).toFixed(1) : '0.0';
                  return (
                    <div key={p.id} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', padding: '20px 40px', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.1s', cursor: 'default' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--secondary)', fontSize: 14 }}>#{String(globalRank).padStart(2, '0')}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, overflow: 'hidden' }}>
                          {p.avatar_url ? <img src={p.avatar_url} alt={p.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : ['👾', '🤖', '💻', '⚡', '🔥'][globalRank % 5]}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--on-surface)', letterSpacing: '-0.01em' }}>{p.username}</div>
                          <div style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--secondary)', letterSpacing: '0.08em', marginTop: 2 }}>
                            {globalRank <= 10 ? 'Elite Guard' : globalRank <= 50 ? 'Veteran' : 'Recruit'}
                          </div>
                        </div>
                      </div>
                      <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--secondary)', textAlign: 'right' }}>{wr}%</div>
                      <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--on-surface)', textAlign: 'right', letterSpacing: '-0.02em' }}>{p.elo.toLocaleString()}</div>
                    </div>
                  );
                })
              )}
            </section>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 40 }}>
                <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                  style={{ padding: '10px 24px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'var(--on-surface-variant)', cursor: page === 0 ? 'not-allowed' : 'pointer', opacity: page === 0 ? 0.3 : 1, fontFamily: 'var(--font-sans)', fontSize: 13 }}>← Prev</button>
                <span style={{ padding: '10px 20px', color: 'var(--on-surface-variant)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{page + 1} / {totalPages}</span>
                <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1}
                  style={{ padding: '10px 24px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'var(--on-surface-variant)', cursor: page === totalPages - 1 ? 'not-allowed' : 'pointer', opacity: page === totalPages - 1 ? 0.3 : 1, fontFamily: 'var(--font-sans)', fontSize: 13 }}>Next →</button>
              </div>
            )}
          </>
        )}
      </main>

      <footer style={{ padding: '24px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(15,15,16,0.2)', backdropFilter: 'blur(20px)', borderTop: '1px solid rgba(255,255,255,0.05)', position: 'relative', zIndex: 1 }}>
        <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--secondary)' }}>© 2024 CLASHVERS. PROTOCOL INITIATED.</div>
        <div style={{ display: 'flex', gap: 32 }}>
          {['Privacy Grid', 'Terms of Combat', 'API Access', 'Neural Link'].map(l => (<a key={l} href="#" style={{ fontSize: 10, textTransform: 'uppercase', color: 'var(--outline)', textDecoration: 'none', letterSpacing: '0.08em' }}>{l}</a>))}
        </div>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(116,118,143,0.5)', fontFamily: 'var(--font-mono)' }}>CLASHV.SYS</div>
      </footer>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
