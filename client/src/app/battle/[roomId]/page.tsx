'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useSocket } from '@/hooks/useSocket';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-full text-slate-500 text-sm" style={{ background: '#1e1e1e' }}>Loading editor…</div>,
});

const LANGUAGES = ['javascript', 'typescript', 'python', 'java', 'cpp'];

const STARTER: Record<string, string> = {
  javascript: `// Write your solution here\nfunction solution(nums, target) {\n  \n}\n`,
  typescript: `// Write your solution here\nfunction solution(nums: number[], target: number): number[] {\n  \n}\n`,
  python: `# Write your solution here\ndef solution(nums, target):\n    pass\n`,
  java: `// Write your solution here\npublic class Solution {\n    public int[] solve() {\n        return new int[]{};\n    }\n}\n`,
  cpp: `// Write your solution here\n#include <bits/stdc++.h>\nusing namespace std;\nvoid solution() {}\n`,
};

function generateDummy(length: number): string {
  if (length === 0) return "// opponent hasn't started typing yet…";
  const lines: string[] = [];
  let rem = length;
  while (rem > 0) { const len = Math.min(rem, 45 + (rem % 23)); lines.push('█'.repeat(len)); rem -= len; }
  return lines.join('\n');
}

function fmtTime(s: number) {
  const m = String(Math.floor(s / 60)).padStart(2, '0');
  const sec = String(s % 60).padStart(2, '0');
  return `${m}:${sec}`;
}

export default function BattlePage() {
  const { roomId } = useParams<{ roomId: string }>();
  const router = useRouter();

  const [myCode, setMyCode] = useState('');
  const [myLang, setMyLang] = useState('javascript');
  const [userId, setUserId] = useState('');
  const [username, setUsername] = useState('');
  const [pendingName, setPendingName] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [problemOpen, setProblemOpen] = useState(true);
  const [chatInput, setChatInput] = useState('');
  const [playerIdx, setPlayerIdx] = useState<0 | 1 | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  const lastSendRef = useRef(0);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const { connected, gameState, joinRoom, sendCodeUpdate, requestDraw, confirmDraw, rejectDraw, requestFinish, confirmFinish, rejectFinish, sendChat } = useSocket();

  // Load identity from localStorage
  useEffect(() => {
    const id = localStorage.getItem('cw_userId');
    const name = localStorage.getItem('cw_username');
    if (id && name) { setUserId(id); setUsername(name); }
    else setShowModal(true);
  }, []);

  // Join room
  useEffect(() => {
    if (!userId || !username || !connected || !roomId || gameState.status !== 'idle') return;
    joinRoom(roomId, userId, username, myLang);
  }, [userId, username, connected, roomId, gameState.status, joinRoom, myLang]);

  // Starter code on lang change (only idle/waiting)
  useEffect(() => {
    if (gameState.status === 'idle' || gameState.status === 'waiting') setMyCode(STARTER[myLang]);
  }, [myLang, gameState.status]);

  // Player index
  useEffect(() => {
    if (gameState.players.length >= 1 && userId) {
      const idx = gameState.players.findIndex(p => p.userId === userId);
      if (idx !== -1) setPlayerIdx(idx as 0 | 1);
    }
  }, [gameState.players, userId]);

  // Countdown timer — uses server-provided startedAt + duration
  useEffect(() => {
    if (gameState.status !== 'active' || !gameState.matchStartedAt) return;
    const tick = () => {
      const elapsed = Date.now() - gameState.matchStartedAt!;
      const left = Math.max(0, Math.floor((gameState.matchDuration - elapsed) / 1000));
      setTimeLeft(left);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [gameState.status, gameState.matchStartedAt, gameState.matchDuration]);

  // Scroll chat
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [gameState.chatMessages]);

  // Throttled code send (max 5/sec)
  const handleCodeChange = useCallback((code: string | undefined) => {
    if (!code) return;
    setMyCode(code);
    const now = Date.now();
    if (now - lastSendRef.current >= 200 && gameState.status === 'active') {
      lastSendRef.current = now;
      sendCodeUpdate(code, myLang);
    }
  }, [gameState.status, myLang, sendCodeUpdate]);

  // Sync language automatically to server when active status begins or language changes
  useEffect(() => {
    if (gameState.status === 'active') {
      sendCodeUpdate(myCode, myLang);
    }
  }, [gameState.status, myLang]);

  const handleUsernameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = pendingName.trim();
    if (!name) return;
    let id = localStorage.getItem('cw_userId');
    if (!id) { id = crypto.randomUUID(); localStorage.setItem('cw_userId', id); }
    localStorage.setItem('cw_username', name);
    setUserId(id); setUsername(name); setShowModal(false);
  };

  const handleChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    sendChat(chatInput.trim()); setChatInput('');
  };

  const opponent = gameState.players.find(p => p.userId !== userId);
  const me = gameState.players.find(p => p.userId === userId);
  const isRevealed = gameState.status === 'revealed';
  const revealedOpponent = gameState.revealData?.players.find(p => p.userId !== userId);
  const winner = gameState.revealData?.winner;
  const iWon = winner && winner !== 'draw' && playerIdx !== null
    ? (winner === 'player1' && playerIdx === 0) || (winner === 'player2' && playerIdx === 1)
    : false;
  const dummyText = useMemo(() => generateDummy(gameState.opponentCodeLength), [gameState.opponentCodeLength]);

  const editorOptions = { fontSize: 13, fontFamily: 'JetBrains Mono, monospace', minimap: { enabled: false }, scrollBeyondLastLine: false, lineNumbers: 'on' as const, padding: { top: 12 }, wordWrap: 'on' as const };

  const timerColor = timeLeft !== null && timeLeft < 60 ? 'var(--error)' : timeLeft !== null && timeLeft < 180 ? '#ffa502' : 'var(--on-surface)';

  // ── Username Modal ──────────────────────────────────────────────────────────
  if (showModal) return (
    <div style={{ height: '100vh', background: 'var(--background)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
      <div className="grid-bg" style={{ position: 'fixed', inset: 0, pointerEvents: 'none' }} />
      {/* Top nav */}
      <header style={{ position: 'fixed', top: 0, width: '100%', zIndex: 50, display: 'flex', alignItems: 'center', padding: '0 32px', height: 80, background: 'rgba(14,14,16,0.60)', backdropFilter: 'blur(40px)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.03em', color: '#A7A9CC', fontStyle: 'italic' }}>Clashvers</div>
      </header>
      <div className="glass-panel" style={{ position: 'relative', zIndex: 1, borderRadius: 24, padding: '48px 40px', display: 'flex', flexDirection: 'column', gap: 20, minWidth: 400, textAlign: 'center' }}>
        <h2 style={{ fontSize: 24, fontWeight: 700, color: 'var(--on-surface)', letterSpacing: '-0.02em' }}>Identify Yourself</h2>
        <p style={{ fontSize: 14, color: 'var(--secondary)' }}>Enter a username to enter the arena</p>
        <form onSubmit={handleUsernameSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 8 }}>
          <input autoFocus value={pendingName} onChange={e => setPendingName(e.target.value)} placeholder="your_handle" maxLength={20}
            style={{ padding: '14px 18px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: 'var(--on-surface)', fontFamily: 'var(--font-sans)', fontSize: 15, outline: 'none', textAlign: 'center' }} />
          <button type="submit" style={{ padding: '15px', background: 'var(--primary)', color: '#131315', fontFamily: 'var(--font-sans)', fontSize: 15, fontWeight: 600, border: 'none', borderRadius: 12, cursor: 'pointer' }}>Enter Arena →</button>
        </form>
      </div>
    </div>
  );

  if (gameState.status === 'idle') return (
    <div style={{ height: '100vh', background: 'var(--background)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, position: 'relative' }}>
      <div className="grid-bg" style={{ position: 'fixed', inset: 0, pointerEvents: 'none' }} />
      <header style={{ position: 'fixed', top: 0, width: '100%', zIndex: 50, display: 'flex', alignItems: 'center', padding: '0 32px', height: 80, background: 'rgba(14,14,16,0.60)', backdropFilter: 'blur(40px)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.03em', color: '#A7A9CC', fontStyle: 'italic' }}>Clashvers</div>
      </header>
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <div style={{ width: 40, height: 40, border: '2px solid rgba(167,169,204,0.15)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ color: 'var(--secondary)', fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{connected ? 'Joining battle room…' : 'Connecting to server…'}</p>
      </div>
    </div>
  );

  // ── Waiting ────────────────────────────────────────────────────────────────
  if (gameState.status === 'waiting') return (
    <div style={{ height: '100vh', background: 'var(--background)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
      <div className="grid-bg" style={{ position: 'fixed', inset: 0, pointerEvents: 'none' }} />
      {/* Radial glow */}
      <div style={{ position: 'fixed', top: '40%', left: '50%', transform: 'translate(-50%,-50%)', width: 600, height: 600, background: 'radial-gradient(circle, rgba(167,169,204,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />

      {/* Top nav */}
      <header style={{ position: 'fixed', top: 0, width: '100%', zIndex: 50, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 32px', height: 80, background: 'rgba(14,14,16,0.60)', backdropFilter: 'blur(40px)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.03em', color: '#A7A9CC', fontStyle: 'italic' }}>Clashvers</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: connected ? '#4ade80' : 'var(--error)', boxShadow: connected ? '0 0 10px rgba(74,222,128,0.8)' : 'none', display: 'inline-block', animation: connected ? 'pulse-dot 2s ease-in-out infinite' : 'none' }} />
          <span style={{ fontSize: 12, color: connected ? '#4ade80' : 'var(--error)', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em' }}>{connected ? 'CONNECTED' : 'OFFLINE'}</span>
        </div>
      </header>

      {/* Main card */}
      <div className="glass-panel" style={{ position: 'relative', zIndex: 1, borderRadius: 28, padding: '56px 56px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 32, textAlign: 'center', maxWidth: 560, width: '90%' }}>
        {/* Radar pulse visual */}
        <div style={{ position: 'relative', width: 100, height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{ position: 'absolute', width: 100, height: 100, borderRadius: '50%', border: '1px solid rgba(167,169,204,0.2)', animation: `ping 2s ease-out ${i * 0.6}s infinite`, opacity: 0 }} />
          ))}
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(167,169,204,0.08)', border: '2px solid rgba(167,169,204,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 24, height: 24, border: '2px solid rgba(167,169,204,0.2)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.9s linear infinite' }} />
          </div>
        </div>

        {/* Logo */}
        <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 800, fontSize: 40, letterSpacing: '-0.03em', fontStyle: 'italic', color: 'var(--primary)' }}>Clashvers</div>

        {/* Status */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--on-surface)', letterSpacing: '-0.02em' }}>Scanning for Opponent</div>
          <div style={{ fontSize: 14, color: 'var(--secondary)', lineHeight: 1.5 }}>Searching for a worthy challenger.<br />This may take a moment — stay sharp.</div>
        </div>

        {/* Room ID */}
        <div style={{ width: '100%', padding: '12px 20px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--secondary)', letterSpacing: '0.05em' }}>ROOM ID</span>
          <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--on-surface-variant)', letterSpacing: '0.05em', maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{roomId}</span>
        </div>

        {/* Share button */}
        <button onClick={() => { navigator.clipboard.writeText(window.location.href); }}
          style={{ padding: '14px 36px', background: 'var(--primary)', color: '#131315', fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 600, border: 'none', borderRadius: 12, cursor: 'pointer', letterSpacing: '-0.01em', width: '100%' }}>
          Invite Opponent — Copy Link
        </button>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes ping { 0% { transform: scale(0.4); opacity: 0.8; } 100% { transform: scale(2.2); opacity: 0; } }
        @keyframes pulse-dot { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
      `}</style>
    </div>
  );

  // -- AI Evaluating Overlay
  const AIOverlay = gameState.aiEvaluating && !isRevealed ? (
    <div style={{ position:'absolute', inset:0, zIndex:50, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:24, background:'rgba(13,13,15,0.97)' }}>
      <div style={{ fontSize:56 }}>&#x1F916;</div>
      <p style={{ fontSize:20, fontWeight:800, color:'var(--on-surface)' }}>AI Judging Solutions</p>
      <div style={{ display:'flex', gap:8 }}>
        {[0,1,2].map(i => <div key={i} style={{ width:8, height:8, borderRadius:'50%', background:'var(--primary)', animation:`pulse-dot 1s ease-in-out ${i*0.3}s infinite` }} />)}
      </div>
      <p style={{ fontSize:13, color:'var(--secondary)', fontFamily:'var(--font-mono)' }}>Analyzing code quality</p>
    </div>
  ) : null;

  // -- Reveal Overlay
  const RevealOverlay = isRevealed ? (
    <div className="absolute inset-0 z-50 flex flex-col bg-background overflow-y-auto font-sans">
      <nav className="sticky top-0 z-10 flex justify-between items-center px-4 md:px-8 h-16 md:h-20 bg-[rgba(19,19,21,0.6)] backdrop-blur-2xl border-b border-white/5 shrink-0">
        <div className="text-xl md:text-2xl font-bold tracking-tight text-primary italic">Clashvers</div>
        <div className="hidden md:flex items-center gap-6">
          {['Arena','Rankings','Career','Hub'].map(l=><a key={l} href={`/${l.toLowerCase()}`} className="text-on-surface-variant font-medium text-sm no-underline hover:text-white transition-colors">{l}</a>)}
        </div>
        <button onClick={() => router.push('/')} className="px-4 md:px-8 py-2 rounded-full bg-primary text-[#131315] font-bold text-xs md:text-sm border-none cursor-pointer hover:brightness-110 transition-all">Back to Arena</button>
      </nav>
      
      <main className="relative py-12 md:py-16 px-4 md:px-8 max-w-[1280px] mx-auto w-full flex flex-col items-center">
        <div className="absolute inset-0 z-[-1] overflow-hidden pointer-events-none opacity-20">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#c2c4e8]/20 rounded-full blur-[120px]" />
        </div>
        
        <section className="text-center mb-8 md:mb-12">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tighter italic uppercase text-primary drop-shadow-[0_0_20px_rgba(194,196,232,0.4)] leading-tight mb-2 md:mb-4">
            {winner === 'draw' ? 'DRAW' : iWon ? 'VICTORY' : 'DEFEAT'}
          </h1>
          <p className="text-sm md:text-lg font-medium text-on-surface-variant tracking-[0.1em] md:tracking-[0.2em] uppercase">
            {winner === 'draw' ? 'Both Competitors Fought Hard' : iWon ? 'Arena Dominance Achieved' : 'Better Luck Next Clash'}
          </p>
        </section>
        
        <section className="w-full flex flex-col lg:grid lg:grid-cols-12 gap-6 lg:gap-8">
          
          {/* Left Column: My Stats */}
          <div className="col-span-4 flex flex-col gap-6">
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 md:p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-[#c2c4e8]/10 flex items-center justify-center text-xl border border-[#c2c4e8]/20 shrink-0">👤</div>
                <div>
                  <h3 className="text-xl font-medium text-primary mb-0.5 truncate">{username}</h3>
                  <p className="text-xs text-on-surface-variant">{iWon ? 'MVP Performance' : winner==='draw' ? 'Balanced Clash' : 'Valiant Effort'}</p>
                </div>
              </div>
              <div className="flex flex-col gap-2.5">
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-[10px] md:text-xs text-on-surface-variant uppercase tracking-widest">Code Length</span>
                  <span className="font-mono text-primary text-xs md:text-sm">{myCode.length} chars</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-[10px] md:text-xs text-on-surface-variant uppercase tracking-widest">Language</span>
                  <span className="font-mono text-primary text-xs md:text-sm">{myLang}</span>
                </div>
              </div>
            </div>
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 border-l-4 border-l-primary rounded-2xl p-5 md:p-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="material-symbols-outlined text-primary text-lg md:text-xl">psychology</span>
                <h4 className="text-[10px] md:text-xs uppercase tracking-widest text-primary font-medium">AI Evaluation</h4>
              </div>
              <p className="text-sm md:text-base text-on-surface italic leading-relaxed mb-4">"{gameState.revealData?.explanation || 'Evaluating...'}"</p>
              {(() => {
                const e = gameState.revealData?.evaluations?.[userId];
                return e ? (
                  <div>
                    <p className="text-xs text-on-surface-variant leading-relaxed mb-3">{e.feedback}</p>
                    <div className="flex gap-2 flex-wrap">
                      <span className="px-2.5 py-1 bg-[#c2c4e8]/10 text-primary rounded-full text-[9px] md:text-[10px] font-bold uppercase">Code Quality</span>
                      <span className="px-2.5 py-1 bg-[#a9ceca]/10 text-secondary rounded-full text-[9px] md:text-[10px] font-bold uppercase">Implementation</span>
                    </div>
                  </div>
                ) : null;
              })()}
            </div>
          </div>
          
          {/* Center Column: ELO Delta Circle */}
          <div className="col-span-4 flex items-center justify-center py-6 md:py-12 order-first lg:order-none">
            <div className="relative">
              <div className="absolute inset-0 bg-[#c2c4e8]/10 rounded-full blur-[48px]" />
              <div className="relative w-48 h-48 md:w-64 md:h-64 rounded-full bg-white/5 backdrop-blur-2xl border-2 border-[#c2c4e8]/30 flex flex-col items-center justify-center overflow-hidden">
                <div className="absolute bottom-0 left-0 w-full h-[72%] bg-gradient-to-t from-[#c2c4e8]/40 to-transparent" />
                <div className="relative z-10 flex flex-col items-center">
                  <span className="text-[10px] md:text-xs text-primary uppercase tracking-[0.2em] mb-2 font-bold">ELO Delta</span>
                  <span className="text-5xl md:text-7xl font-semibold text-white leading-none">
                    {(() => { const d = gameState.eloDeltas?.[userId]; return d !== undefined ? (d >= 0 ? `+${d}` : `${d}`) : '?'; })()}
                  </span>
                  <div className="mt-3 md:mt-4 px-3 md:px-4 py-1.5 bg-[#02020a]/80 rounded-full border border-white/10">
                    <span className="font-mono text-primary text-[10px] md:text-xs">{me?.elo ? `${me.elo} ELO` : 'Ranked'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Right Column: Opponent Stats */}
          <div className="col-span-4 flex flex-col gap-6">
            {gameState.revealData?.players.filter(p => p.userId !== userId).map(p => {
              const evalData = gameState.revealData?.evaluations?.[p.userId];
              const oppDelta = gameState.eloDeltas?.[p.userId];
              return (
                <div key={p.userId} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden flex flex-col">
                  <div className="px-4 md:px-5 py-3 bg-white/5 border-b border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs md:text-sm font-bold text-tertiary truncate max-w-[120px]">{p.username}</span>
                      <span className="text-[10px] md:text-xs text-secondary font-mono">[{p.language}]</span>
                    </div>
                    {oppDelta !== undefined && <span className={`px-2 md:px-2.5 py-0.5 rounded-full text-[10px] md:text-[11px] font-black font-mono ${oppDelta>=0?'bg-[#a9ceca]/15 text-secondary':'bg-[#ffb4ab]/15 text-error'}`}>{oppDelta>=0?`+${oppDelta}`:`${oppDelta}`} ELO</span>}
                  </div>
                  <div className="h-[180px] md:h-[220px]">
                    <MonacoEditor height="100%" language={p.language} value={p.code} theme="vs-dark" options={{ ...editorOptions, readOnly:true }} />
                  </div>
                  {evalData && <div className="px-4 py-2.5 border-t border-white/10 bg-black/30">
                    <p className="text-[10px] md:text-xs text-on-surface-variant leading-relaxed line-clamp-3">{evalData.feedback}</p>
                  </div>}
                </div>
              );
            })}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 flex flex-col items-center justify-center">
                <span className="material-symbols-outlined text-secondary mb-2 text-xl md:text-2xl">military_tech</span>
                <span className="font-mono text-lg md:text-xl text-secondary font-medium">{iWon?'WIN':winner==='draw'?'DRAW':'LOSS'}</span>
                <span className="text-[9px] md:text-[10px] text-on-surface-variant uppercase tracking-[0.1em] mt-1 font-bold">Result</span>
              </div>
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 flex flex-col items-center justify-center">
                <span className="material-symbols-outlined text-tertiary mb-2 text-xl md:text-2xl">code</span>
                <span className="font-mono text-sm md:text-base text-tertiary font-medium uppercase truncate max-w-[80px]">{myLang}</span>
                <span className="text-[9px] md:text-[10px] text-on-surface-variant uppercase tracking-[0.1em] mt-1 font-bold">Language</span>
              </div>
            </div>
          </div>
          
        </section>
        
        <section className="mt-8 md:mt-12 flex flex-col sm:flex-row flex-wrap justify-center gap-4 md:gap-6 w-full sm:w-auto">
          <button onClick={() => navigator.clipboard?.writeText(window.location.href)} className="w-full sm:w-auto bg-white/5 backdrop-blur-xl border border-white/10 px-6 md:px-8 py-3 md:py-4 rounded-full flex items-center justify-center gap-3 text-primary cursor-pointer text-xs md:text-sm font-medium uppercase tracking-widest hover:bg-white/10 transition-colors">
            <span className="material-symbols-outlined text-lg md:text-xl">share</span> Share Result
          </button>
          <button onClick={() => router.push('/')} className="w-full sm:w-auto bg-primary px-8 md:px-10 py-3 md:py-4 rounded-full flex items-center justify-center gap-3 text-[#131315] cursor-pointer text-xs md:text-sm font-bold uppercase tracking-widest border-none shadow-[0_10px_30px_rgba(194,196,232,0.2)] hover:brightness-110 hover:-translate-y-1 transition-all">
            <span className="material-symbols-outlined text-lg md:text-xl">play_arrow</span> Queue Next
          </button>
        </section>
      </main>
      
      <footer className="w-full px-6 md:px-12 py-6 flex flex-col md:flex-row justify-between items-center gap-6 bg-[rgba(2,2,10,0.4)] backdrop-blur-2xl border-t border-white/5 shrink-0 mt-auto text-[10px] tracking-widest uppercase">
        <div className="text-white/30 font-bold">2024 CLASHVERS. PROTOCOL INITIATED.</div>
        <div className="flex flex-wrap justify-center gap-4 md:gap-8">
          {['Privacy Grid','Terms of Combat','Neural Link'].map(l=><a key={l} href="#" className="text-white/25 no-underline hover:text-white/50">{l}</a>)}
        </div>
        <div className="font-bold text-[#a9ceca]/50 flex items-center gap-2">
           <span className="w-2 h-2 rounded-full bg-[#a9ceca]/50 animate-pulse" />
           SYSTEM_STABLE
        </div>
      </footer>
    </div>
  ) : null;


  // ── Draw Request Modal ─────────────────────────────────────────────────────
  const isOpponentDraw = gameState.drawPending && gameState.drawRequesterName !== null;
  const DrawModal = isOpponentDraw ? (
    <div className="absolute inset-0 z-40 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}>
      <div className="flex flex-col items-center gap-6 text-center w-full max-w-[380px]" style={{
        background: 'rgba(10,0,0,0.92)',
        border: '1px solid rgba(255,180,171,0.3)',
        borderRadius: '1.5rem',
        padding: '2.5rem 2rem',
        boxShadow: '0 0 60px rgba(255,180,171,0.15), inset 0 1px 0 rgba(255,255,255,0.05)',
      }}>
        <div className="text-5xl">🤝</div>
        <div>
          <p className="text-white font-bold text-xl mb-2 tracking-wide">Draw Request</p>
          <p className="text-sm" style={{ color: 'var(--secondary)' }}>
            <strong style={{ color: 'var(--error)' }}>{gameState.drawRequesterName}</strong> wants to call a draw
          </p>
        </div>
        <div className="h-px w-full" style={{ background: 'rgba(255,180,171,0.15)' }} />
        <div className="flex flex-col sm:flex-row gap-4 w-full">
          <button
            onClick={() => { confirmDraw(); }}
            className="flex-1 py-3 px-2 rounded-xl font-bold text-white text-xs sm:text-sm tracking-widest uppercase transition-all hover:brightness-110"
            style={{ background: 'var(--primary)', boxShadow: '0 4px 20px rgba(255,180,171,0.3)' }}
          >✓ Accept</button>
          <button
            onClick={() => { rejectDraw(); }}
            className="flex-1 py-3 px-2 rounded-xl font-bold text-xs sm:text-sm tracking-widest uppercase transition-all hover:bg-white/5"
            style={{ border: '1px solid rgba(255,255,255,0.1)', color: 'var(--secondary)' }}
          >✕ Reject</button>
        </div>
      </div>
    </div>
  ) : null;

  // ── Finish Early Modal ─────────────────────────────────────────────────────
  const isOpponentFinish = gameState.finishPending && gameState.finishRequesterName !== null;
  const FinishModal = isOpponentFinish ? (
    <div className="absolute inset-0 z-40 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}>
      <div className="flex flex-col items-center gap-6 text-center w-full max-w-[380px]" style={{
        background: 'rgba(10,0,0,0.92)',
        border: '1px solid rgba(255,180,171,0.3)',
        borderRadius: '1.5rem',
        padding: '2.5rem 2rem',
        boxShadow: '0 0 60px rgba(255,180,171,0.15), inset 0 1px 0 rgba(255,255,255,0.05)',
      }}>
        <div className="text-5xl">🏁</div>
        <div>
          <p className="text-white font-bold text-xl mb-2 tracking-wide">Early Submit Request</p>
          <p className="text-sm" style={{ color: 'var(--secondary)' }}>
            <strong style={{ color: 'var(--error)' }}>{gameState.finishRequesterName}</strong> is done and wants to submit early.
          </p>
        </div>
        <div className="h-px w-full" style={{ background: 'rgba(255,180,171,0.15)' }} />
        <div className="flex flex-col sm:flex-row gap-4 w-full">
          <button
            onClick={() => { confirmFinish(); }}
            className="flex-1 py-3 px-2 rounded-xl font-bold text-white text-xs sm:text-sm tracking-widest uppercase transition-all hover:brightness-110 flex items-center justify-center gap-2"
            style={{ background: 'var(--primary)', boxShadow: '0 4px 20px rgba(255,180,171,0.3)' }}
          >🏁 Submit Now</button>
          <button
            onClick={() => { rejectFinish(); }}
            className="flex-1 py-3 px-2 rounded-xl font-bold text-xs sm:text-sm tracking-widest uppercase transition-all hover:bg-white/5 flex items-center justify-center gap-2"
            style={{ border: '1px solid rgba(255,255,255,0.1)', color: 'var(--secondary)' }}
          >⌨ Keep Coding</button>
        </div>
      </div>
    </div>
  ) : null;

  // ── Arena ──────────────────────────────────────────────────────────────────
  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden relative font-sans">
      {AIOverlay}
      {RevealOverlay}
      {DrawModal}
      {FinishModal}

      {/* Top Nav */}
      <nav className="fixed top-0 w-full z-50 flex flex-wrap md:flex-nowrap justify-between items-center px-4 md:px-8 py-3 md:py-0 min-h-[80px] bg-[rgba(19,19,21,0.6)] backdrop-blur-2xl border-b border-white/5 shadow-[0_4px_24px_rgba(0,0,0,0.4)] gap-y-3">
        {/* Left: Logo + problem */}
        <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-4">
            <span className="text-xl md:text-2xl font-bold tracking-tight text-primary italic">Clashvers</span>
            <span className="hidden sm:inline text-xs md:text-sm text-on-surface-variant font-mono max-w-[200px] truncate">{gameState.problem?.title ?? '…'}</span>
          </div>
          <div className="md:hidden flex items-center gap-2">
             <span className="flex items-center gap-1.5 text-[10px] font-mono text-secondary">
               <span className={`w-2 h-2 rounded-full ${connected ? 'bg-secondary shadow-[0_0_8px_rgba(169,206,202,0.8)]' : 'bg-error shadow-none'}`} />
             </span>
          </div>
        </div>

        {/* Center: Timer pill */}
        <div className="w-full md:w-auto flex justify-center md:absolute md:left-1/2 md:-translate-x-1/2 order-last md:order-none pb-2 md:pb-0">
          <div className="px-6 py-1.5 bg-[rgba(20,20,22,0.6)] backdrop-blur-3xl border border-white/10 border-t-[#c2c4e8]/30 rounded-full flex items-center gap-3">
            <span className="material-symbols-outlined text-sm md:text-base text-secondary">timer</span>
            <span className="font-mono text-xl md:text-2xl font-medium text-secondary tracking-widest drop-shadow-[0_0_10px_rgba(169,206,202,0.8)]">
              {timeLeft !== null ? fmtTime(timeLeft) : '00:00'}
            </span>
          </div>
        </div>

        {/* Right: Status + actions */}
        <div className="hidden md:flex items-center gap-4">
          <span className={`flex items-center gap-1.5 text-xs font-mono ${connected ? 'text-secondary' : 'text-error'}`}>
            <span className={`w-2 h-2 rounded-full inline-block ${connected ? 'bg-secondary shadow-[0_0_8px_rgba(169,206,202,0.8)]' : 'bg-error'}`} />
            {connected ? 'Synchronized' : 'Offline'}
          </span>
          {gameState.status === 'active' && (
            <button onClick={requestFinish} disabled={!!gameState.finishPending}
              className={`px-4 py-2 bg-[#c2c4e8]/10 border border-[#c2c4e8]/30 text-primary rounded-lg font-mono text-xs font-bold cursor-pointer transition-opacity ${gameState.finishPending ? 'opacity-40' : 'opacity-100 hover:bg-[#c2c4e8]/20'}`}>
              🏁 {gameState.finishPending ? 'Pending…' : 'Submit Early'}
            </button>
          )}
          {gameState.status === 'active' && (
            <button onClick={requestDraw} disabled={!!gameState.drawPending || gameState.drawAttempts >= 3}
              className={`px-4 py-2 bg-white/5 border border-white/10 text-on-surface-variant rounded-lg font-mono text-xs font-bold cursor-pointer transition-opacity ${(gameState.drawPending||gameState.drawAttempts>=3) ? 'opacity-40' : 'opacity-100 hover:bg-white/10'}`}>
              🤝 {gameState.drawPending ? 'Pending…' : `Draw (${3 - gameState.drawAttempts})`}
            </button>
          )}
        </div>
      </nav>

      {/* Main content */}
      <main className="flex-1 mt-[110px] md:mt-[80px] p-4 md:p-8 flex flex-col lg:flex-row gap-6 overflow-y-auto lg:overflow-hidden h-[calc(100vh-110px)] md:h-[calc(100vh-80px)]">

        {/* Left: Monaco Editor */}
        <section className="flex-1 flex flex-col gap-4 min-w-0 min-h-[400px] lg:min-h-0">
          {/* Editor title bar */}
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2 md:gap-3">
              <span className="material-symbols-outlined text-lg md:text-xl text-primary">terminal</span>
              <span className="text-base md:text-xl font-medium text-on-surface tracking-tight truncate max-w-[120px] md:max-w-none">{username || 'You'}.{myLang}</span>
              <span className="hidden sm:inline px-2 py-0.5 rounded text-[10px] font-bold bg-[#c2c4e8]/10 text-primary border border-[#c2c4e8]/20 uppercase tracking-widest">Write Mode</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden md:inline text-xs text-outline tracking-wider font-mono">Chars: {myCode.length}</span>
              <select value={myLang} onChange={e => setMyLang(e.target.value)}
                className="px-2 py-1 bg-white/5 border border-white/10 text-on-surface rounded-md font-mono text-xs outline-none cursor-pointer">
                {LANGUAGES.map(l => <option key={l} value={l} className="bg-[#131315] text-[#c2c4e8]">{l}</option>)}
              </select>
            </div>
          </div>

          {/* Problem collapsed bar */}
          {!problemOpen && (
            <button onClick={() => setProblemOpen(true)} className="px-4 py-1.5 text-left bg-white/5 border border-white/10 rounded-lg text-secondary text-xs font-mono cursor-pointer truncate">
              📋 {gameState.problem?.title} — click to expand
            </button>
          )}
          {problemOpen && gameState.problem && (
            <div className="shrink-0 max-h-[140px] overflow-y-auto p-3 md:p-4 relative bg-[rgba(20,20,22,0.6)] backdrop-blur-xl border border-white/10 rounded-xl">
              <button onClick={() => setProblemOpen(false)} className="absolute top-2 right-3 bg-transparent border-none text-secondary cursor-pointer text-sm">✕</button>
              <p className="font-semibold text-on-surface mb-1 text-xs md:text-sm">{gameState.problem.title}</p>
              <p className="text-on-surface-variant text-xs leading-relaxed mb-2">{gameState.problem.description}</p>
              <pre className="text-outline text-[10px] md:text-xs font-mono whitespace-pre-wrap break-all leading-relaxed m-0">{gameState.problem.examples}</pre>
            </div>
          )}

          {/* Glass editor card */}
          <div className="flex-1 min-h-[300px] lg:min-h-0 flex flex-col bg-[rgba(20,20,22,0.4)] backdrop-blur-xl border border-[#c2c4e8]/20 rounded-2xl md:rounded-[24px] overflow-hidden shadow-[0_0_15px_rgba(194,196,232,0.1)]">
            {/* Editor chrome bar */}
            <div className="h-8 md:h-10 bg-white/5 border-b border-white/10 flex items-center px-4 justify-between shrink-0">
              <div className="flex gap-2">
                <div className="w-2 md:w-2.5 h-2 md:h-2.5 rounded-full bg-[#ffb4ab]/60" />
                <div className="w-2 md:w-2.5 h-2 md:h-2.5 rounded-full bg-[#dcc591]/60" />
                <div className="w-2 md:w-2.5 h-2 md:h-2.5 rounded-full bg-[#a9ceca]/60" />
              </div>
              <span className="font-mono text-[9px] md:text-[10px] text-white/30 tracking-wider">Clashvers-IDE v1.0.4</span>
            </div>
            {/* Monaco */}
            <div className="flex-1 min-h-0 relative z-0">
              <MonacoEditor height="100%" language={myLang} value={myCode} theme="vs-dark" onChange={handleCodeChange} options={editorOptions} />
            </div>
          </div>
        </section>

        {/* Right: HUD Sidebar */}
        <aside className="w-full lg:w-96 flex flex-col gap-6 shrink-0 z-10 pb-8 md:pb-0">

          {/* Opponent Card */}
          <div className="bg-[rgba(20,20,22,0.4)] backdrop-blur-xl border border-white/10 rounded-[24px] p-5 md:p-6 relative overflow-hidden">
            {/* Live indicator */}
            <div className="absolute top-3 right-3 p-2">
              <span className="material-symbols-outlined text-sm md:text-base text-error" style={{ fontVariationSettings:"'FILL' 1" }}>sensors</span>
            </div>

            <div className="flex items-center gap-4 mb-6">
              <div className="relative shrink-0">
                <div className="w-12 md:w-16 h-12 md:h-16 rounded-xl border border-white/10 overflow-hidden bg-[#74768f]/20 flex items-center justify-center text-xl md:text-2xl">⚔</div>
                <div className="absolute -bottom-1 -right-1 px-1.5 py-0.5 bg-error text-[8px] md:text-[10px] font-bold rounded text-white uppercase tracking-tighter">LIVE</div>
              </div>
              <div className="min-w-0">
                <h3 className="text-lg md:text-xl font-medium text-on-surface leading-snug truncate">{opponent?.username ?? 'Opponent'}</h3>
                <p className="text-xs text-outline uppercase tracking-widest mt-0.5">{opponent?.elo ? `${opponent.elo} ELO` : 'Unknown'}</p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-outline uppercase tracking-widest text-[10px]">Code Progress</span>
                <span className="text-secondary font-mono text-xs">{gameState.opponentCodeLength} chars</span>
              </div>
              {/* Progress bar */}
              <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                <div className="h-full bg-secondary shadow-[0_0_10px_rgba(169,206,202,0.5)] transition-all duration-500" style={{ width:`${Math.min(100, (gameState.opponentCodeLength/500)*100)}%` }} />
              </div>
              {gameState.opponentCodeLength > 0 && (
                <div className="flex items-center gap-2 text-[10px] text-[#a9ceca]/60 font-mono">
                  <span className="material-symbols-outlined text-xs">keyboard</span>
                  OPPONENT IS TYPING...
                </div>
              )}
              {!isRevealed && gameState.opponentCodeLength === 0 && (
                <div className="flex items-center gap-2 text-[10px] text-outline font-mono">
                  🔒 Code locked until match ends
                </div>
              )}
            </div>
          </div>

          {/* Stats bento grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[rgba(20,20,22,0.4)] backdrop-blur-xl border border-white/10 rounded-2xl md:rounded-[24px] p-4 md:p-6">
              <div className="text-[10px] text-white/30 uppercase tracking-wider mb-1">My ELO</div>
              <div className="text-xl md:text-2xl font-medium text-on-surface font-mono">{me?.elo ?? '—'}</div>
            </div>
            <div className="bg-[rgba(20,20,22,0.4)] backdrop-blur-xl border border-white/10 rounded-2xl md:rounded-[24px] p-4 md:p-6">
              <div className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Enemy ELO</div>
              <div className="text-xl md:text-2xl font-medium text-on-surface font-mono">{opponent?.elo ?? '—'}</div>
            </div>
          </div>

          {/* System Log (replaces chat) */}
          <div className="flex-1 min-h-[250px] lg:min-h-0 flex flex-col bg-[rgba(20,20,22,0.4)] backdrop-blur-xl border border-white/10 rounded-2xl md:rounded-[24px] overflow-hidden">
            <div className="bg-white/5 border-b border-white/10 px-4 py-2 flex items-center justify-between shrink-0">
              <span className="font-mono text-[10px] text-outline uppercase tracking-widest">System Log</span>
              <span className="material-symbols-outlined text-sm md:text-base text-outline">terminal</span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
              {gameState.chatMessages.length === 0 ? (
                <div className="flex gap-2 text-[11px] md:text-xs font-mono">
                  <span className="text-secondary">[00:00]</span>
                  <span className="text-[#c2c4e8]/60">Connection established to Arena</span>
                </div>
              ) : gameState.chatMessages.map((msg, i) => (
                <div key={i} className="flex gap-2 text-[11px] md:text-xs font-mono break-words">
                  <span className="shrink-0" style={{ color: msg.userId === userId ? 'var(--secondary)' : 'var(--tertiary)' }}>{msg.username}:</span>
                  <span className="text-[#c2c4e8]/70" dangerouslySetInnerHTML={{ __html: msg.message }} />
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            {/* Command input */}
            <form onSubmit={handleChat} className="p-3 border-t border-white/10 bg-black/20 flex gap-3 items-center shrink-0">
              <span className="text-secondary font-bold font-mono text-xs md:text-sm">&gt;</span>
              <input value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Send message…" maxLength={200}
                className="flex-1 bg-transparent border-none outline-none text-[11px] md:text-xs text-on-surface font-mono" />
              <button type="submit" className="bg-transparent border-none cursor-pointer flex items-center">
                <span className="material-symbols-outlined text-sm md:text-base text-secondary">send</span>
              </button>
            </form>
          </div>
        </aside>
      </main>

      {/* Footer */}
      <footer className="hidden lg:flex w-full px-12 py-3 justify-between items-center bg-[rgba(2,2,10,0.2)] backdrop-blur-xl border-t border-white/5 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-[#a9ceca]/50 tracking-wider">CLASHVERS</span>
          <span className="text-[10px] tracking-widest uppercase text-white/30">© 2024 PROTOCOL INITIATED.</span>
        </div>
        <div className="flex gap-8">
          {['Privacy Grid','Terms of Combat','Neural Link'].map(l => (
            <a key={l} href="#" className="text-[10px] tracking-widest uppercase text-white/25 no-underline hover:text-white/50">{l}</a>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-secondary shadow-[0_0_8px_rgba(169,206,202,0.8)]" />
          <span className="text-[10px] tracking-widest uppercase text-secondary">Synchronized</span>
        </div>
      </footer>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes ping { 0% { transform: scale(0.4); opacity: 0.8; } 100% { transform: scale(2.2); opacity: 0; } }
        @keyframes pulse-dot { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
      `}</style>
    </div>
  );
}
