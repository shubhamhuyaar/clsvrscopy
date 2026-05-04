'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TopNav } from '@/components/TopNav';

interface PlayerProfile { id: string; username: string; elo: number; wins: number; losses: number; }
interface MatchHistory { id: string; player1_username: string | null; player2_username: string | null; player1_id: string | null; player2_id: string | null; winner: string | null; elo_change_p1: number | null; elo_change_p2: number | null; problem_title: string | null; created_at: string | null; ended_at: string | null; }

const timeAgo = (d: string) => { const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000); if (s < 60) return 'just now'; const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`; const h = Math.floor(m / 60); return h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`; };

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
    const amP1 = String(m.player1_id) === String(userId);
    const amP2 = String(m.player2_id) === String(userId);
    if ((m.winner === 'player1' && amP1) || (m.winner === 'player2' && amP2)) return { label: 'VICTORY', color: '#4ade80', chip: 'rgba(74,222,128,0.1)' };
    return { label: 'DEFEAT', color: 'var(--error)', chip: 'rgba(255,180,171,0.1)' };
  };

  const getOpponent = (m: MatchHistory) => (m.player1_username === profile?.username ? m.player2_username : m.player1_username) || 'Unknown';

  const total = profile ? profile.wins + profile.losses : 0;
  const wr = total > 0 ? ((profile!.wins / total) * 100).toFixed(1) : '0.0';

  if (loading) return <div className="text-white flex justify-center items-center h-screen">LOADING...</div>;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--background)', overflow: 'auto' }}>
      <div className="grid-bg" style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'fixed', top: '30%', right: '10%', width: 500, height: 500, background: 'radial-gradient(circle, rgba(167,169,204,0.04) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />
      <style>{`
        .glass-panel {
            background: rgba(30, 30, 35, 0.4);
            backdrop-filter: blur(40px);
            border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .radar-grid {
            background-image: radial-gradient(circle, rgba(169, 206, 202, 0.1) 1px, transparent 1px);
            background-size: 20px 20px;
        }
        .material-symbols-outlined {
            font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        }
        .scrollbar-hide::-webkit-scrollbar {
            display: none;
        }
        .scrollbar-hide {
            -ms-overflow-style: none;
            scrollbar-width: none;
        }
      `}</style>
      
      <TopNav active="career" />
      
      {/* Main Canvas */}
      <main style={{ paddingTop: 120, paddingBottom: 80, paddingLeft: 32, paddingRight: 32, maxWidth: 1280, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        <div className="max-w-7xl mx-auto grid grid-cols-12 gap-8">
          
          {/* Hero Profile Section */}
          <div className="col-span-12 lg:col-span-4 flex flex-col gap-8">
            {/* Large Glass Avatar */}
            <div className="glass-panel rounded-[32px] p-8 flex flex-col items-center relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent opacity-50"></div>
              <div className="relative w-64 h-80 rounded-[24px] overflow-hidden border border-white/20 shadow-2xl transition-transform duration-500 group-hover:scale-[1.02]">
                <img alt="Detailed Avatar" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCKBakTMxw1Bb8Rbb6Aq1OnYAp62HjJGGWPp95vBEFw-3O5lcNdwpLl8vmnXn-Iz5vkBIOWogL1mfDOjIQQ9ygQXzwBw4j47mY3f1gcCFz3aNJP9zSh3cKpf8a3aj8-0BYbZNnelGs0VsUKqLUQpxrbJ0Vb4YeNAn0uswnNMjuUweXiCIY5HPr4JEsIFEVr-M3LHkZo7Jee4nGjCHHVeSFPAE_Dr1oKa6CGXY3Bmd6ktIJauwXQ_EW4Vj9B34zSOGANZo76FY_v5XY"/>
                <div className="absolute bottom-4 right-4 bg-primary text-on-primary px-4 py-1 rounded-full font-bold shadow-lg flex items-center gap-2">
                  <span className="text-xs uppercase tracking-tighter">Level</span>
                  <span className="text-lg">84</span>
                </div>
              </div>
              <div className="mt-8 text-center">
                <h1 className="font-headline-lg text-on-surface mb-2 tracking-tight">{profile?.username || 'Unknown'}</h1>
                <p className="text-primary font-code-md opacity-80 uppercase tracking-widest">Master Commander - Season 12</p>
              </div>
            </div>
            
            {/* Skill Radar Chart */}
            <div className="glass-panel rounded-[32px] p-8 flex flex-col items-center min-h-[360px] relative overflow-hidden">
              <h3 className="w-full font-label-sm uppercase tracking-[0.2em] text-slate-400 mb-8">Performance Vector</h3>
              <div className="radar-grid relative w-56 h-56 rounded-full border border-teal-500/20 flex items-center justify-center">
                <svg className="absolute w-full h-full drop-shadow-[0_0_15px_rgba(169,206,202,0.4)]" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" fill="none" r="45" stroke="rgba(169,206,202,0.1)" strokeWidth="0.5"></circle>
                  <circle cx="50" cy="50" fill="none" r="30" stroke="rgba(169,206,202,0.1)" strokeWidth="0.5"></circle>
                  <circle cx="50" cy="50" fill="none" r="15" stroke="rgba(169,206,202,0.1)" strokeWidth="0.5"></circle>
                  <path d="M50 10 L85 30 L80 75 L50 90 L15 70 L20 35 Z" fill="rgba(169,206,202,0.2)" stroke="#a9ceca" strokeWidth="1"></path>
                  <circle cx="50" cy="10" fill="#a9ceca" r="1.5"></circle>
                  <circle cx="85" cy="30" fill="#a9ceca" r="1.5"></circle>
                  <circle cx="80" cy="75" fill="#a9ceca" r="1.5"></circle>
                  <circle cx="50" cy="90" fill="#a9ceca" r="1.5"></circle>
                  <circle cx="15" cy="70" fill="#a9ceca" r="1.5"></circle>
                  <circle cx="20" cy="35" fill="#a9ceca" r="1.5"></circle>
                </svg>
                <div className="absolute top-0 text-[10px] text-teal-300 font-bold uppercase tracking-tighter">Atk</div>
                <div className="absolute bottom-0 text-[10px] text-teal-300 font-bold uppercase tracking-tighter">Def</div>
                <div className="absolute left-0 text-[10px] text-teal-300 font-bold uppercase tracking-tighter">Spd</div>
                <div className="absolute right-0 text-[10px] text-teal-300 font-bold uppercase tracking-tighter">Int</div>
              </div>
              <div className="mt-8 grid grid-cols-2 w-full gap-4">
                <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                  <div className="text-[10px] uppercase text-slate-500 mb-1">Win Rate</div>
                  <div className="text-lg font-bold text-teal-300 font-inter">{wr}%</div>
                </div>
                <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                  <div className="text-[10px] uppercase text-slate-500 mb-1">Combat Rating</div>
                  <div className="text-lg font-bold text-primary font-inter">{profile?.elo || 0}</div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Content Area */}
          <div className="col-span-12 lg:col-span-8 flex flex-col gap-8">
            {/* Trophy Case */}
            <section className="glass-panel rounded-[32px] p-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="font-headline-md tracking-tight">Milestone Archive</h2>
                <span className="text-slate-500 text-xs uppercase tracking-widest font-medium">12 / 48 Collected</span>
              </div>
              <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide">
                <div className="flex-shrink-0 w-32 h-40 glass-panel rounded-2xl flex flex-col items-center justify-center gap-3 border-teal-500/20 group hover:border-teal-400 transition-all cursor-pointer">
                  <div className="w-16 h-16 rounded-full bg-teal-500/10 flex items-center justify-center border border-teal-400/30 group-hover:bg-teal-500/20 transition-all shadow-[0_0_20px_rgba(169,206,202,0.1)]">
                    <span className="material-symbols-outlined text-teal-300 text-3xl" data-icon="workspace_premium">workspace_premium</span>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-tighter text-teal-100 text-center px-2">First Strike Pioneer</span>
                </div>
                <div className="flex-shrink-0 w-32 h-40 glass-panel rounded-2xl flex flex-col items-center justify-center gap-3 border-primary/20 group hover:border-primary transition-all cursor-pointer">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center border border-primary/30 group-hover:bg-primary/20 transition-all shadow-[0_0_20px_rgba(167,169,204,0.1)]">
                    <span className="material-symbols-outlined text-primary text-3xl" data-icon="star">star</span>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-tighter text-primary text-center px-2">Stellar Tactician</span>
                </div>
                <div className="flex-shrink-0 w-32 h-40 glass-panel rounded-2xl flex flex-col items-center justify-center gap-3 border-white/5 opacity-50 grayscale group hover:opacity-100 hover:grayscale-0 transition-all cursor-pointer">
                  <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                    <span className="material-symbols-outlined text-slate-500 text-3xl" data-icon="lock">lock</span>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-tighter text-slate-500 text-center px-2">Void Walker</span>
                </div>
              </div>
            </section>
            
            {/* Match History */}
            <section className="glass-panel rounded-[32px] p-8 flex-1">
              <div className="flex justify-between items-center mb-8">
                <h2 className="font-headline-md tracking-tight">Recent Deployments</h2>
                <div className="flex gap-2">
                  <span className="px-4 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] uppercase font-bold text-slate-400 hidden sm:block">All Regimes</span>
                  <span className="px-4 py-1 rounded-full bg-primary/10 border border-primary/20 text-[10px] uppercase font-bold text-primary">Competitive</span>
                </div>
              </div>
              <div className="flex flex-col gap-4">
                {matches.length === 0 ? (
                   <div className="text-center p-8 text-slate-500">No recent deployments found.</div>
                ) : matches.map(m => {
                  const result = getResult(m);
                  const opponent = getOpponent(m);
                  const isWin = result.label === 'VICTORY';
                  const isDraw = result.label === 'DRAW';
                  const myEloChange = String(m.player1_id) === String(userId) ? m.elo_change_p1 : m.elo_change_p2;
                  const displayXp = myEloChange ? Math.abs(myEloChange) : 0;
                  
                  return (
                    <div key={m.id} className={`glass-panel p-4 sm:p-6 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between group hover:bg-white/5 transition-all cursor-pointer border-l-4 ${isWin ? 'border-l-primary' : isDraw ? 'border-l-tertiary' : 'border-l-slate-600'} gap-4 sm:gap-0`}>
                      <div className="flex items-center gap-4 sm:gap-6 w-full sm:w-auto">
                        <div className={`${isWin ? 'text-primary' : isDraw ? 'text-tertiary' : 'text-slate-500'} flex flex-col items-center w-20 sm:w-24 shrink-0`}>
                          <span className="font-bold text-lg sm:text-xl font-inter">{result.label}</span>
                          <span className="text-[10px] uppercase tracking-widest font-bold opacity-60">{isWin ? 'Success' : isDraw ? 'Standstill' : 'System Fail'}</span>
                        </div>
                        <div className="w-[1px] h-10 bg-white/10 hidden sm:block"></div>
                        <div className="flex-1 min-w-0">
                          <div className="text-on-surface font-headline-sm text-base sm:text-lg truncate">{m.problem_title || 'Unknown Battle'}</div>
                          <div className="text-slate-500 text-xs font-code-md truncate">vs {opponent} - {timeAgo(m.created_at || new Date().toISOString())}</div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-8 w-full sm:w-auto pl-24 sm:pl-0">
                        <div className="text-left sm:text-right">
                          <div className={`${isWin ? 'text-teal-300' : isDraw ? 'text-slate-400' : 'text-error-container'} font-bold text-base sm:text-lg`}>
                            {isWin ? '+' : isDraw ? '' : '-'}{displayXp} XP
                          </div>
                          <div className="text-slate-500 text-[10px] uppercase tracking-widest">Rank Progress</div>
                        </div>
                        <span className="material-symbols-outlined text-slate-500 group-hover:translate-x-1 transition-transform" data-icon="chevron_right">chevron_right</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
