'use client';

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Crosshair, Cpu, Terminal, Sword } from 'lucide-react';
import { Auth } from '@/components/Auth';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

export default function Home() {
  const router = useRouter();
  const [language, setLanguage] = useState('python');
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check session in localStorage
    const stored = localStorage.getItem('clashvers_session');
    if (stored) {
      setSession(JSON.parse(stored));
    }
    setLoading(false);
  }, []);

  const handleStartBattle = async () => {
    if (!session) return;
    
    // Create match via backend REST endpoint
    try {
      const res = await fetch(`${SOCKET_URL}/room/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: session.userId,
          username: session.username
        })
      });
      const data = await res.json();
      if (data.roomId) {
        router.push(`/battle/${data.roomId}?lang=${language}`);
      }
    } catch (err) {
      console.error("Matchmaking error:", err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white font-mono uppercase tracking-[0.5em] animate-pulse">
        Initializing System...
      </div>
    );
  }

  if (!session) {
    return <Auth />;
  }

  return (
    <div className="relative min-h-screen w-full bg-black text-white selection:bg-white selection:text-black">
      {/* Hero Section */}
      <section className="min-h-screen flex flex-col justify-center items-center px-6 relative z-10 text-center">
        <div className="inline-flex items-center gap-3 px-4 py-1.5 border border-white/20 text-[10px] font-mono tracking-[0.5em] mb-16 uppercase opacity-80 animate-flicker bg-white/5">
           System Operational
        </div>
        
        <h1 className="text-8xl md:text-[12rem] font-black text-white mb-10 font-orbitron tracking-tighter leading-none select-none">
          CLASH<span className="opacity-20">VERS</span>
        </h1>
        
        <p className="text-xs md:text-sm text-neutral-500 font-grotesk max-w-lg mx-auto tracking-[0.6em] mb-20 uppercase font-medium">
          MINIMALIST COMPETITIVE CODE DUELS
        </p>
        
        <div className="flex flex-col items-center gap-12">
          <div className="flex items-center gap-6">
            <span className="text-[10px] font-mono tracking-[0.4em] text-neutral-600 uppercase font-bold">Select Language:</span>
            <select 
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="bg-black text-white border border-white/20 text-[10px] font-mono px-4 py-2 uppercase outline-none focus:border-white transition-all cursor-pointer hover:bg-white/5"
            >
              <option value="python">PYTHON</option>
              <option value="javascript">JAVASCRIPT</option>
              <option value="java">JAVA</option>
              <option value="go">GO</option>
              <option value="cpp">C++</option>
            </select>
          </div>
          
          <button 
            onClick={handleStartBattle}
            className="btn-monolith group relative"
          >
            <span className="relative z-10">Initialize Arena</span>
          </button>
        </div>

        <div className="mt-32 opacity-10">
            <div className="w-[1px] h-24 bg-white mx-auto animate-pulse"></div>
        </div>
      </section>

      {/* Feature Section: Binary Execution */}
      <section className="min-h-screen bg-white text-black flex items-center px-6 md:px-24 relative overflow-hidden">
        <div className="max-w-4xl relative z-10">
            <div className="text-[10px] font-black font-mono tracking-[0.5em] uppercase mb-8 opacity-40">Protocol // 01</div>
            <h2 className="text-7xl md:text-9xl font-black font-orbitron mb-12 tracking-tighter uppercase leading-none">
            Binary<br/>Execution
            </h2>
            <p className="text-xs text-black/60 font-mono max-w-lg mb-16 leading-relaxed tracking-widest uppercase font-bold">
            REAL-TIME 1V1 ALGORITHMIC COMBAT. WITNESS PURE LOGIC IN A DISTRACTION-FREE ENVIRONMENT. DEPLOY CODE. REACH TERMINAL VELOCITY.
            </p>
            <div className="flex gap-6">
                <div className="w-14 h-14 border border-black flex items-center justify-center hover:bg-black hover:text-white transition-all cursor-pointer">
                    <Sword className="w-6 h-6" />
                </div>
                <div className="w-14 h-14 border border-black flex items-center justify-center hover:bg-black hover:text-white transition-all cursor-pointer">
                    <Terminal className="w-6 h-6" />
                </div>
            </div>
        </div>
        <div className="absolute right-0 top-0 h-full w-1/3 bg-black/5 pointer-events-none"></div>
      </section>

      {/* AI Section: Intelligence Engine */}
      <section className="min-h-screen bg-black flex flex-col justify-center items-end px-6 md:px-24 text-right">
        <div className="max-w-4xl flex flex-col items-end">
            <div className="text-[10px] font-black font-mono tracking-[0.5em] uppercase mb-8 opacity-40">Protocol // 02</div>
            <h2 className="text-7xl md:text-9xl font-black font-orbitron text-white mb-10 tracking-tighter uppercase leading-none">
            Intelligence<br/>Engine
            </h2>
            <p className="text-xs text-neutral-600 font-mono max-w-lg mb-16 leading-relaxed tracking-widest uppercase font-bold">
            ADVANCED HEURISTIC ANALYSIS. INFINITE PROBLEM VECTORS. AUTOMATED COMPLEXITY BENCHMARKING REFINED BY CLASHVERS CORE.
            </p>
            <div className="px-8 py-4 border border-white/20 text-white font-black font-orbitron text-[11px] uppercase tracking-[0.6em] hover:bg-white hover:text-black transition-all cursor-default">
                Log(n) Performance
            </div>
        </div>
      </section>
    </div>
  );
}
