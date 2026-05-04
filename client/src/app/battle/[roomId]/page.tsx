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

  // ── AI Evaluating Overlay ──────────────────────────────────────────────────
  const AIOverlay = gameState.aiEvaluating && !isRevealed ? (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-6" style={{ background: 'rgba(13,13,15,0.97)' }}>
      <div className="text-5xl animate-pulse">🤖</div>
      <p className="text-white font-bold text-xl">AI Judging Solutions…</p>
      <div className="flex gap-1">
        {[0, 1, 2].map(i => <div key={i} className="w-2 h-2 rounded-full bg-red-400" style={{ animation: `pulse-glow 1s ease-in-out ${i * 0.3}s infinite` }} />)}
      </div>
      <p className="text-slate-500 text-sm">Analyzing code quality and correctness</p>
    </div>
  ) : null;

  // ── Reveal Overlay ─────────────────────────────────────────────────────────
  const RevealOverlay = isRevealed ? (
    <div style={{ position: 'absolute', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column', alignItems: 'center', overflowY: 'auto', background: 'var(--background)', padding: '32px 32px 64px' }}>

      {/* ── Result Banner ── */}
      <div className="w-full max-w-7xl shrink-0 mb-6">
        <div className="flex items-center justify-center gap-4 py-6 rounded-2xl mb-5"
          style={{
            background: winner === 'draw'
              ? 'rgba(116,118,143,0.1))'
              : iWon
                ? 'rgba(167,169,204,0.08)'
                : 'linear-gradient(135deg, rgba(180,0,30,0.2), rgba(255,180,171,0.05))',
            border: `1px solid ${winner === 'draw' ? 'rgba(255,200,0,0.2)' : iWon ? 'rgba(0,255,100,0.2)' : 'rgba(255,180,171,0.25)'}`,
          }}
        >
          <span className="text-5xl">
            {winner === 'draw' ? '🤝' : iWon ? '🏆' : '💀'}
          </span>
          <div>
            <div className="text-5xl font-black tracking-tight"
              style={{ color: winner === 'draw' ? '#ffd700' : iWon ? '#4ade80' : '#ff003c', textShadow: `0 0 40px ${winner === 'draw' ? 'rgba(255,215,0,0.5)' : iWon ? 'rgba(74,222,128,0.5)' : 'rgba(255,180,171,0.5)'}` }}
            >
              {winner === 'draw' ? 'Draw!' : iWon ? 'Victory!' : 'Defeat'}
            </div>
            <div className="text-sm mt-1 uppercase tracking-widest" style={{ color: 'var(--secondary)' }}>
              {winner === 'draw' ? 'Both players fought hard' : iWon ? 'You outclashed your opponent' : 'Better luck next clash'}
            </div>
          </div>
        </div>

        {/* AI Conclusion */}
        <div className="rounded-2xl p-5" style={{ background: 'rgba(19,19,21,0.8)', border: '1px solid rgba(255,180,171,0.15)' }}>
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl">🤖</span>
            <strong className="text-white text-base uppercase tracking-widest">AI Match Conclusion</strong>
          </div>
          <p className="text-slate-300 leading-relaxed text-sm whitespace-pre-wrap">
            {gameState.revealData?.explanation || 'Evaluating based on code quality and completeness...'}
          </p>
        </div>
      </div>

      {/* ── Player Panels ── */}
      <div className="flex gap-5 w-full max-w-7xl flex-1 min-h-[520px]">
        {gameState.revealData?.players.map((p) => {
          const evalData = gameState.revealData?.evaluations?.[p.userId];
          const isMe = p.userId === userId;
          const eloDelta = gameState.eloDeltas?.[p.userId];
          const accentColor = isMe ? '#4ade80' : '#ff003c';
          return (
            <div key={p.userId} className="flex-1 flex flex-col rounded-2xl overflow-hidden shadow-2xl"
              style={{ border: `1px solid ${isMe ? 'rgba(74,222,128,0.25)' : 'rgba(255,180,171,0.25)'}`, background: 'rgba(19,19,21,0.7)' }}
            >
              {/* Panel Header */}
              <div className="px-5 py-3 shrink-0 flex items-center justify-between"
                style={{ background: isMe ? 'rgba(74,222,128,0.06)' : 'rgba(255,180,171,0.06)', borderBottom: `1px solid ${isMe ? 'rgba(74,222,128,0.15)' : 'rgba(255,180,171,0.15)'}` }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">{isMe ? '👤' : '⚔'}</span>
                  <span className="font-bold text-sm uppercase tracking-widest" style={{ color: accentColor }}>
                    {isMe ? 'You' : 'Opponent'}
                  </span>
                  <span className="text-slate-400 text-xs font-mono">— {p.username} [{p.language}]</span>
                </div>
                {eloDelta !== undefined && (
                  <span className="px-3 py-1 rounded-full text-xs font-black"
                    style={{
                      background: eloDelta >= 0 ? 'rgba(74,222,128,0.12)' : 'rgba(255,180,171,0.12)',
                      color: eloDelta >= 0 ? '#4ade80' : '#ffb4ab',
                      border: `1px solid ${eloDelta >= 0 ? 'rgba(74,222,128,0.2)' : 'rgba(255,180,171,0.2)'}`,
                    }}
                  >
                    {eloDelta >= 0 ? `▲ +${eloDelta}` : `▼ ${eloDelta}`} ELO
                  </span>
                )}
              </div>

              {/* Code Editor */}
              <div className="flex-1 min-h-0">
                <MonacoEditor height="100%" language={p.language} value={p.code} theme="vs-dark" options={{ ...editorOptions, readOnly: true }} />
              </div>

              {/* Feedback Panel */}
              {evalData && (
                <div className="shrink-0 p-5 text-sm overflow-y-auto" style={{ height: '42%', borderTop: `1px solid ${isMe ? 'rgba(74,222,128,0.12)' : 'rgba(255,180,171,0.12)'}`, background: 'rgba(0,0,0,0.5)' }}>
                  <p className="font-black mb-2 text-xs uppercase tracking-widest flex items-center gap-2" style={{ color: accentColor }}>
                    🔬 Implementation Feedback
                  </p>
                  <p className="text-slate-300 mb-5 leading-relaxed whitespace-pre-wrap text-xs">{evalData.feedback}</p>
                  <p className="font-black mb-2 text-xs uppercase tracking-widest flex items-center gap-2" style={{ color: accentColor }}>
                    ✨ Next Steps
                  </p>
                  <p className="text-slate-300 leading-relaxed whitespace-pre-wrap text-xs">{evalData.improvements}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Back Button */}
      <button
        onClick={() => router.push('/')}
        className="mt-8 shrink-0 px-10 py-4 rounded-2xl font-bold text-white text-base uppercase tracking-widest transition-all hover:brightness-110 active:scale-[0.98]"
        style={{ background: 'var(--primary)', boxShadow: '0 6px 30px rgba(255,180,171,0.35)' }}
      >
        ← Back to Lobby
      </button>
    </div>
  ) : null;


  // ── Draw Request Modal ─────────────────────────────────────────────────────
  const isOpponentDraw = gameState.drawPending && gameState.drawRequesterName !== null;
  const DrawModal = isOpponentDraw ? (
    <div className="absolute inset-0 z-40 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}>
      <div className="flex flex-col items-center gap-6 text-center" style={{
        background: 'rgba(10,0,0,0.92)',
        border: '1px solid rgba(255,180,171,0.3)',
        borderRadius: '1.5rem',
        padding: '2.5rem 3rem',
        minWidth: 360,
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
        <div className="flex gap-4 w-full">
          <button
            onClick={() => { confirmDraw(); }}
            className="flex-1 py-3 rounded-xl font-bold text-white text-sm tracking-widest uppercase transition-all hover:brightness-110"
            style={{ background: 'var(--primary)', boxShadow: '0 4px 20px rgba(255,180,171,0.3)' }}
          >✓ Accept</button>
          <button
            onClick={() => { rejectDraw(); }}
            className="flex-1 py-3 rounded-xl font-bold text-sm tracking-widest uppercase transition-all hover:bg-white/5"
            style={{ border: '1px solid rgba(255,255,255,0.1)', color: 'var(--secondary)' }}
          >✕ Reject</button>
        </div>
      </div>
    </div>
  ) : null;

  // ── Finish Early Modal ─────────────────────────────────────────────────────
  const isOpponentFinish = gameState.finishPending && gameState.finishRequesterName !== null;
  const FinishModal = isOpponentFinish ? (
    <div className="absolute inset-0 z-40 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}>
      <div className="flex flex-col items-center gap-6 text-center" style={{
        background: 'rgba(10,0,0,0.92)',
        border: '1px solid rgba(255,180,171,0.3)',
        borderRadius: '1.5rem',
        padding: '2.5rem 3rem',
        minWidth: 380,
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
        <div className="flex gap-4 w-full">
          <button
            onClick={() => { confirmFinish(); }}
            className="flex-1 py-3 rounded-xl font-bold text-white text-sm tracking-widest uppercase transition-all hover:brightness-110"
            style={{ background: 'var(--primary)', boxShadow: '0 4px 20px rgba(255,180,171,0.3)' }}
          >🏁 Submit Now</button>
          <button
            onClick={() => { rejectFinish(); }}
            className="flex-1 py-3 rounded-xl font-bold text-sm tracking-widest uppercase transition-all hover:bg-white/5"
            style={{ border: '1px solid rgba(255,255,255,0.1)', color: 'var(--secondary)' }}
          >⌨ Keep Coding</button>
        </div>
      </div>
    </div>
  ) : null;

  // ── Arena ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative', background: 'var(--background)' }}>
      {AIOverlay}
      {RevealOverlay}
      {DrawModal}
      {FinishModal}

      {/* Header */}
      <header style={{ display:'flex', alignItems:'center', gap:12, padding:'0 20px', height:52, flexShrink:0, zIndex:10, background:'rgba(19,19,21,0.97)', borderBottom:'1px solid rgba(255,255,255,0.08)' }}>
        <span style={{ fontFamily:'var(--font-sans)', fontWeight:800, fontSize:18, letterSpacing:'-0.03em', fontStyle:'italic', color:'var(--primary)' }}>Clashvers</span>
        <div style={{ width:1, height:18, background:'rgba(255,255,255,0.1)' }} />
        <span style={{ fontSize:11, color:'var(--secondary)', fontFamily:'var(--font-mono)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:220 }}>{gameState.problem?.title ?? '…'}</span>
        <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:12 }}>
          <span style={{ display:'flex', alignItems:'center', gap:6, fontSize:11, fontFamily:'var(--font-mono)', color: connected ? '#4ade80' : 'var(--error)' }}>
            <span style={{ width:7, height:7, borderRadius:'50%', background: connected ? '#4ade80' : 'var(--error)', boxShadow: connected ? '0 0 8px rgba(74,222,128,0.8)' : 'none', display:'inline-block' }} />
            {connected ? 'LIVE' : 'OFFLINE'}
          </span>
          {gameState.status === 'active' && timeLeft !== null && (
            <span style={{ fontSize:15, fontWeight:800, fontFamily:'var(--font-mono)', color:timerColor, letterSpacing:'-0.02em' }}>⏱ {fmtTime(timeLeft)}</span>
          )}
          {gameState.status === 'active' && (
            <button onClick={requestFinish} disabled={!!gameState.finishPending}
              style={{ padding:'6px 14px', background:'rgba(167,169,204,0.1)', border:'1px solid rgba(167,169,204,0.25)', color:'var(--primary)', borderRadius:8, fontFamily:'var(--font-mono)', fontSize:11, fontWeight:700, cursor:'pointer', opacity: gameState.finishPending ? 0.4 : 1 }}>
              🏁 {gameState.finishPending ? 'Pending…' : 'Submit Early'}
            </button>
          )}
          {gameState.status === 'active' && (
            <button onClick={requestDraw} disabled={!!gameState.drawPending || gameState.drawAttempts >= 3}
              style={{ padding:'6px 14px', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', color:'var(--on-surface-variant)', borderRadius:8, fontFamily:'var(--font-mono)', fontSize:11, fontWeight:700, cursor:'pointer', opacity:(gameState.drawPending||gameState.drawAttempts>=3) ? 0.4 : 1 }}>
              🤝 {gameState.drawPending ? 'Pending…' : `Draw (${3 - gameState.drawAttempts})`}
            </button>
          )}
        </div>
      </header>

      {/* Problem Panel */}
      {problemOpen && gameState.problem && (
        <div style={{ flexShrink:0, maxHeight:160, overflowY:'auto', padding:'12px 20px', position:'relative', background:'rgba(255,255,255,0.02)', borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
          <button onClick={() => setProblemOpen(false)} style={{ position:'absolute', top:10, right:14, background:'none', border:'none', color:'var(--secondary)', cursor:'pointer', fontSize:14 }}>✕</button>
          <p style={{ fontWeight:600, color:'var(--on-surface)', marginBottom:6, fontSize:13 }}>{gameState.problem.title}</p>
          <p style={{ color:'var(--on-surface-variant)', fontSize:12, lineHeight:1.65, marginBottom:8 }}>{gameState.problem.description}</p>
          <pre style={{ color:'var(--secondary)', fontSize:11, fontFamily:'var(--font-mono)', whiteSpace:'pre-wrap', wordBreak:'break-all', lineHeight:1.5, margin:0 }}>{gameState.problem.examples}</pre>
        </div>
      )}
      {!problemOpen && (
        <button onClick={() => setProblemOpen(true)} style={{ flexShrink:0, padding:'5px 20px', textAlign:'left', background:'rgba(255,255,255,0.015)', borderBottom:'1px solid rgba(255,255,255,0.06)', borderTop:'none', borderLeft:'none', borderRight:'none', color:'var(--secondary)', fontSize:11, fontFamily:'var(--font-mono)', cursor:'pointer' }}>
          📋 {gameState.problem?.title} — click to expand
        </button>
      )}

      {gameState.errorMessage && (
        <div style={{ flexShrink:0, padding:'5px 20px', fontSize:11, textAlign:'center', background:'rgba(255,180,171,0.08)', color:'var(--error)', borderBottom:'1px solid rgba(255,180,171,0.15)' }}>{gameState.errorMessage}</div>
      )}
      {gameState.isRateLimited && (
        <div style={{ flexShrink:0, padding:'4px 20px', fontSize:11, textAlign:'center', background:'rgba(220,197,145,0.08)', color:'var(--tertiary)' }}>⚠ Typing too fast — slowing sync</div>
      )}

      {/* Editors row */}
      <div style={{ flex:1, minHeight:0, display:'flex', overflow:'hidden' }}>
        {/* My Editor */}
        <div style={{ flex:1, minWidth:0, display:'flex', flexDirection:'column', borderRight:'2px solid rgba(255,255,255,0.07)' }}>
          <div style={{ flexShrink:0, display:'flex', alignItems:'center', gap:10, padding:'8px 14px', background:'rgba(167,169,204,0.04)', borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
            <span style={{ width:8, height:8, borderRadius:'50%', background:'var(--primary)', boxShadow:'0 0 8px rgba(167,169,204,0.6)', flexShrink:0 }} />
            <span style={{ fontSize:11, fontFamily:'var(--font-mono)', color:'var(--primary)', fontWeight:700 }}>YOU — {username}{me?.elo ? ` [${me.elo} ELO]` : ''}</span>
            <select value={myLang} onChange={e => setMyLang(e.target.value)}
              style={{ marginLeft:'auto', padding:'3px 8px', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', color:'var(--on-surface)', borderRadius:6, fontFamily:'var(--font-mono)', fontSize:11, outline:'none', cursor:'pointer' }}>
              {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div style={{ flex:1, minHeight:0 }}>
            <MonacoEditor height="100%" language={myLang} value={myCode} theme="vs-dark" onChange={handleCodeChange} options={editorOptions} />
          </div>
        </div>

        {/* Enemy Editor */}
        <div style={{ flex:1, minWidth:0, display:'flex', flexDirection:'column' }}>
          <div style={{ flexShrink:0, display:'flex', alignItems:'center', gap:10, padding:'8px 14px', background:'rgba(220,197,145,0.04)', borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
            <span style={{ width:8, height:8, borderRadius:'50%', background:'var(--tertiary)', boxShadow:'0 0 8px rgba(220,197,145,0.6)', flexShrink:0 }} />
            <span style={{ fontSize:11, fontFamily:'var(--font-mono)', color:'var(--tertiary)', fontWeight:700 }}>ENEMY — {opponent?.username ?? 'Unknown'}{opponent?.elo ? ` [${opponent.elo} ELO]` : ''}</span>
            <span style={{ marginLeft:'auto', fontSize:11, fontFamily:'var(--font-mono)', color:'var(--secondary)' }}>{gameState.opponentCodeLength} chars</span>
          </div>
          <div style={{ flex:1, minHeight:0, position:'relative', overflow:'hidden' }}>
            <pre style={{ position:'absolute', inset:0, padding:12, fontSize:12, fontFamily:'var(--font-mono)', lineHeight:1.5, background:'#1e1e1e', color:'rgba(255,255,255,0.12)', whiteSpace:'pre-wrap', wordBreak:'break-all', margin:0, overflow:'hidden' }}>{dummyText}</pre>
            {!isRevealed && (
              <div style={{ position:'absolute', inset:0, backdropFilter:'blur(10px)', background:'rgba(13,13,15,0.65)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:10 }}>
                <span style={{ fontSize:36 }}>🔒</span>
                <p style={{ fontSize:14, fontFamily:'var(--font-mono)', color:'var(--tertiary)', fontWeight:700 }}>
                  {gameState.opponentCodeLength > 0 ? `${gameState.opponentCodeLength} chars` : 'Waiting…'}
                </p>
                <p style={{ fontSize:11, color:'var(--secondary)' }}>Revealed by AI on time's up</p>
              </div>
            )}
            {isRevealed && revealedOpponent && (
              <div style={{ position:'absolute', inset:0 }}>
                <MonacoEditor height="100%" language={revealedOpponent.language} value={revealedOpponent.code} theme="vs-dark" options={{ ...editorOptions, readOnly:true }} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chat */}
      <div style={{ flexShrink:0, height:112, borderTop:'1px solid rgba(255,255,255,0.07)', background:'rgba(19,19,21,0.9)', display:'flex', flexDirection:'column' }}>
        <div style={{ flex:1, overflowY:'auto', padding:'6px 14px', display:'flex', flexDirection:'column', gap:3 }}>
          {gameState.chatMessages.map((msg, i) => (
            <div key={i} style={{ fontSize:12, wordBreak:'break-all' }}>
              <span style={{ fontFamily:'var(--font-mono)', fontWeight:700, color: msg.userId === userId ? 'var(--primary)' : 'var(--tertiary)' }}>{msg.username}: </span>
              <span style={{ color:'var(--on-surface-variant)' }} dangerouslySetInnerHTML={{ __html: msg.message }} />
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>
        <form onSubmit={handleChat} style={{ display:'flex', gap:8, padding:'0 12px 8px' }}>
          <input value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Chat…" maxLength={200}
            style={{ flex:1, padding:'7px 12px', fontSize:12, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', color:'var(--on-surface)', borderRadius:8, fontFamily:'var(--font-mono)', outline:'none' }} />
          <button type="submit" style={{ padding:'7px 18px', background:'var(--primary)', color:'#131315', fontSize:12, fontWeight:700, border:'none', borderRadius:8, cursor:'pointer', fontFamily:'var(--font-mono)', letterSpacing:'0.04em' }}>SEND</button>
        </form>
      </div>
    </div>
  );
}
