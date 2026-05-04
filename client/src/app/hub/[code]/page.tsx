'use client';

import { useState, useEffect, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';

interface HubMember {
  userId: string;
  username: string;
  role: 'ADMIN' | 'USER';
  elo: number;
}

interface Broadcast {
  id: string;
  content: string;
  author: string;
  createdAt: string;
}

interface ChatMessage {
  username: string;
  message: string;
  timestamp: number;
}

export default function HubDashboard({ params }: { params: Promise<{ code: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [nodeData, setNodeData] = useState<any>(null);
  const [members, setMembers] = useState<HubMember[]>([]);
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [chatLog, setChatLog] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [broadcastInput, setBroadcastInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeUsers, setActiveUsers] = useState<Set<string>>(new Set());
  const [showMembers, setShowMembers] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const API_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

  const nodeCode = resolvedParams.code.toUpperCase();

  const mRole = members.find(m => m.userId === userId)?.role || 'USER';

  useEffect(() => {
    const savedUserId = localStorage.getItem('cw_userId');
    const savedUsername = localStorage.getItem('cw_username');
    if (!savedUserId) {
      router.push('/hub');
      return;
    }
    setUserId(savedUserId);
    setUsername(savedUsername);
    fetchNodeData(savedUserId);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatLog]);

  async function fetchNodeData(uid: string) {
    try {
      const res = await fetch(`${API_URL}/api/nodes/${nodeCode}`);
      if (!res.ok) {
        setError('NODE NOT FOUND OR ACCESS DENIED');
        setLoading(false);
        return;
      }
      const data = await res.json();
      setNodeData(data.node);
      setMembers(data.members);
      setBroadcasts(data.broadcasts);
      setLoading(false);

      if (data.node) {
        initSocket(localStorage.getItem('cw_username') || 'Unknown');
      }
    } catch {
      setError('CRITICAL NETWORK FAILURE');
      setLoading(false);
    }
  }

  function initSocket(uname: string) {
    if (socketRef.current) return;
    const socket = io(API_URL);
    socketRef.current = socket;

    socket.emit('join_node_chat', { code: nodeCode, username: uname });

    socket.on('node_activity', (payload: { username: string; status: string }) => {
      setActiveUsers(prev => {
        const next = new Set(prev);
        if (payload.status === 'online') next.add(payload.username);
        else next.delete(payload.username);
        return next;
      });
    });

    socket.on('node_chat_message', (msg: ChatMessage) => {
      setChatLog(prev => [...prev, msg].slice(-100));
    });

    socket.on('node_broadcast_update', () => {
      fetch(`${API_URL}/api/nodes/${nodeCode}`)
        .then(r => r.json())
        .then(d => {
           if(d.broadcasts) setBroadcasts(d.broadcasts);
           if(d.members) setMembers(d.members);
        }).catch(()=>{});
    });
  }

  useEffect(() => {
    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

  async function handleBroadcast(e: React.FormEvent) {
    e.preventDefault();
    if (!broadcastInput.trim() || mRole !== 'ADMIN') return;
    const content = broadcastInput.trim();
    setBroadcastInput('');

    try {
      const res = await fetch(`${API_URL}/api/nodes/${nodeCode}/broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, content })
      });
      if (res.ok && socketRef.current) {
        socketRef.current.emit('node_broadcast_update', { code: nodeCode });
      }
    } catch (err) {
      console.error(err);
    }
  }

  function sendChat(e: React.FormEvent) {
    e.preventDefault();
    if (!chatInput.trim() || !socketRef.current) return;
    socketRef.current.emit('node_chat_message', { code: nodeCode, username, message: chatInput.trim() });
    setChatInput('');
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-[#36393f]">
        <div className="text-white animate-pulse text-sm">ESTABLISHING SECURE CONNECTION...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-[#36393f] text-red-500 font-sans">
        <div className="text-4xl mb-4 font-black">ACCESS DENIED</div>
        <div>{error}</div>
        <button onClick={() => router.push('/hub')} className="mt-8 px-6 py-2 border border-red-500 hover:bg-red-500/10 rounded">RETURN</button>
      </div>
    );
  }

  return (
  return (
    <div style={{ minHeight: '100vh', background: 'var(--background)', overflow: 'hidden', display: 'flex', flexDirection: 'column', fontFamily: 'var(--font-sans)' }}>
       {/* HEADER */}
       <header style={{ minHeight: 80, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', padding: '16px 32px', background: 'rgba(14,14,16,0.60)', backdropFilter: 'blur(40px)', borderBottom: '1px solid rgba(255,255,255,0.05)', flexShrink: 0, position: 'relative', zIndex: 50, gap: 16 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 24 }}>
             <button onClick={() => router.push('/hub')} style={{ background: 'transparent', border: 'none', color: 'var(--on-surface-variant)', cursor: 'pointer', fontSize: 24, padding: 0 }}>&larr;</button>
             <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--on-surface)', letterSpacing: '-0.02em', wordBreak: 'break-all' }}>{nodeData?.name}</h1>
             {mRole === 'ADMIN' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(255,255,255,0.05)', padding: '6px 16px', borderRadius: 9999, border: '1px solid rgba(255,255,255,0.1)' }}>
                   <span style={{ fontSize: 10, color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 600 }}>Invite Credential</span>
                   <span style={{ fontSize: 14, fontFamily: 'var(--font-mono)', color: 'var(--primary)', fontWeight: 700, letterSpacing: '0.1em' }}>{nodeCode}</span>
                </div>
             )}
          </div>
          
          <div style={{ position: 'relative' }}>
             <button 
               onClick={() => setShowMembers(!showMembers)} 
               style={{ padding: '10px 24px', borderRadius: 12, background: 'rgba(167,169,204,0.1)', color: 'var(--primary)', fontWeight: 600, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em', border: '1px solid rgba(167,169,204,0.25)', cursor: 'pointer' }}
             >
                Members ({members.length})
             </button>
             
             {showMembers && (
               <div style={{ position: 'absolute', top: 56, right: 0, width: 320, background: 'rgba(19,19,21,0.95)', backdropFilter: 'blur(40px)', borderRadius: 20, border: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', overflow: 'hidden', zIndex: 50, maxHeight: '70vh', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
                  <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)', fontSize: 11, fontWeight: 700, color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
                     Alliance Members
                  </div>
                  <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
                     {members.map(m => {
                       const isOnline = activeUsers.has(m.username) || m.username === username;
                       return (
                         <div key={m.userId} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px', borderRadius: 12, background: isOnline ? 'rgba(74,222,128,0.05)' : 'transparent', border: '1px solid transparent', cursor: 'default' }}>
                            <div style={{ position: 'relative' }}>
                               <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(194,196,232,0.1)', border: '1px solid rgba(194,196,232,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', fontWeight: 700, fontSize: 16 }}>
                                 {m.username.charAt(0).toUpperCase()}
                               </div>
                               <div style={{ position: 'absolute', bottom: -2, right: -2, width: 14, height: 14, border: '2px solid var(--background)', borderRadius: '50%', background: isOnline ? '#4ade80' : 'var(--outline)' }} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                               <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                 <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--on-surface)' }}>{m.username}</span>
                                 {m.role === 'ADMIN' && <span style={{ fontSize: 10, color: 'var(--tertiary)', fontWeight: 800, background: 'rgba(220,197,145,0.15)', padding: '2px 8px', borderRadius: 9999, letterSpacing: '0.05em' }}>ADMIN</span>}
                               </div>
                            </div>
                         </div>
                       )
                     })}
                  </div>
               </div>
             )}
          </div>
       </header>

       {/* MAIN CONTENT */}
       <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', overflowY: 'auto', padding: 32, gap: 32, minHeight: 0 }}>
          
          {/* LEFT SIDE: EVENTS SECTION */}
          <div style={{ flex: '1 1 400px', display: 'flex', flexDirection: 'column', background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(40px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 24, overflow: 'hidden', maxHeight: '80vh' }}>
             <div style={{ padding: '24px 32px', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--on-surface)', display: 'flex', alignItems: 'center', gap: 12, letterSpacing: '-0.02em' }}>
                  <span className="material-symbols-outlined" style={{ color: 'var(--tertiary)' }}>event_note</span> Community Logs
                </h2>
                <p style={{ fontSize: 13, color: 'var(--on-surface-variant)', marginTop: 8 }}>Official transmissions and protocol updates.</p>
             </div>
             
             <div style={{ flex: 1, overflowY: 'auto', padding: 32, display: 'flex', flexDirection: 'column', gap: 24 }}>
                {broadcasts.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--on-surface-variant)', fontSize: 13, fontStyle: 'italic', marginTop: 40 }}>No transmissions found in this sector.</div>
                ) : (
                  broadcasts.map(b => (
                    <div key={b.id} style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 16, padding: 24, borderLeft: '4px solid var(--tertiary)', border: '1px solid rgba(255,255,255,0.05)', position: 'relative' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 12 }}>
                         <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--primary)' }}>{b.author}</span>
                         <span style={{ fontSize: 11, color: 'var(--secondary)', fontFamily: 'var(--font-mono)' }}>
                            {new Date(b.createdAt).toLocaleDateString()} @ {new Date(b.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                         </span>
                      </div>
                      <div style={{ color: 'var(--on-surface)', fontSize: 15, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{b.content}</div>
                    </div>
                  ))
                )}
             </div>

             {/* ADMIN EVENT POST BOX */}
             {mRole === 'ADMIN' && (
               <div style={{ padding: 24, background: 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <form onSubmit={handleBroadcast} style={{ display: 'flex', gap: 12 }}>
                    <input 
                      type="text" 
                      value={broadcastInput}
                      onChange={e => setBroadcastInput(e.target.value)}
                      placeholder="Transmit new event..."
                      style={{ flex: 1, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '12px 20px', color: 'var(--on-surface)', fontSize: 14, outline: 'none' }}
                      onFocus={e => { e.target.style.borderColor = 'var(--tertiary)'; }}
                      onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; }}
                    />
                    <button type="submit" disabled={!broadcastInput.trim()} style={{ padding: '0 24px', background: 'var(--tertiary)', color: 'var(--on-tertiary)', fontWeight: 700, fontSize: 14, borderRadius: 12, border: 'none', cursor: broadcastInput.trim() ? 'pointer' : 'not-allowed', opacity: broadcastInput.trim() ? 1 : 0.5, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                      Transmit
                    </button>
                  </form>
               </div>
             )}
          </div>

          {/* RIGHT SIDE: CHAT */}
          <div style={{ flex: '2 1 500px', display: 'flex', flexDirection: 'column', background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(40px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 24, overflow: 'hidden', maxHeight: '80vh' }}>
             
             {/* Chat Header */}
             <div style={{ padding: '24px 32px', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
               <h3 style={{ color: 'var(--on-surface)', fontWeight: 700, fontSize: 20, display: 'flex', alignItems: 'center', gap: 12, letterSpacing: '-0.02em' }}>
                 <span className="material-symbols-outlined" style={{ color: 'var(--primary)' }}>forum</span> Alliance Comms
               </h3>
               <p style={{ fontSize: 13, color: 'var(--on-surface-variant)', marginTop: 8 }}>Encrypted peer-to-peer transmission channel.</p>
             </div>

             {/* Chat Log */}
             <div style={{ flex: 1, overflowY: 'auto', padding: 32, display: 'flex', flexDirection: 'column', gap: 24 }}>
               {chatLog.length === 0 ? (
                 <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--on-surface-variant)', fontStyle: 'italic', fontSize: 14 }}>Initialize communications...</div>
               ) : (
                 chatLog.map((chat, i) => {
                   const isMe = chat.username === username;
                   return (
                     <div key={i} style={{ display: 'flex', gap: 16 }}>
                       <div style={{ width: 44, height: 44, flexShrink: 0, borderRadius: '50%', background: isMe ? 'var(--primary)' : 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isMe ? 'var(--on-primary)' : 'var(--on-surface)', fontWeight: 700, fontSize: 18 }}>
                         {chat.username.charAt(0).toUpperCase()}
                       </div>
                       <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                         <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 4 }}>
                           <span style={{ fontSize: 15, fontWeight: 700, color: isMe ? 'var(--primary)' : 'var(--on-surface)' }}>{chat.username}</span>
                           <span style={{ fontSize: 11, color: 'var(--secondary)', fontFamily: 'var(--font-mono)' }}>
                             {new Date(chat.timestamp || Date.now()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                           </span>
                         </div>
                         <div style={{ color: 'var(--on-surface-variant)', fontSize: 15, lineHeight: 1.6, wordBreak: 'break-word', background: isMe ? 'rgba(194,196,232,0.05)' : 'transparent', padding: isMe ? '12px 16px' : 0, borderRadius: isMe ? '0 16px 16px 16px' : 0, border: isMe ? '1px solid rgba(194,196,232,0.1)' : 'none' }}>
                           {chat.message}
                         </div>
                       </div>
                     </div>
                   );
                 })
               )}
               <div ref={chatEndRef} />
             </div>

             {/* Chat Input */}
             <div style={{ padding: 24, background: 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
               <form onSubmit={sendChat} style={{ display: 'flex' }}>
                 <div style={{ position: 'relative', width: '100%' }}>
                   <span className="material-symbols-outlined" style={{ position: 'absolute', left: 20, top: '50%', transform: 'translateY(-50%)', color: 'var(--on-surface-variant)', fontSize: 20 }}>chat</span>
                   <input 
                     type="text" 
                     value={chatInput}
                     onChange={e => setChatInput(e.target.value)}
                     style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: '16px 20px 16px 56px', color: 'var(--on-surface)', fontSize: 15, outline: 'none' }}
                     placeholder="Transmit to alliance..."
                     onFocus={e => { e.target.style.borderColor = 'var(--primary)'; }}
                     onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; }}
                   />
                 </div>
               </form>
             </div>
          </div>
       </div>
    </div>
  );
}
