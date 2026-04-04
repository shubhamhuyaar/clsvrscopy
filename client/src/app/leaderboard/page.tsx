'use client';

export const dynamic = 'force-dynamic';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Trophy } from 'lucide-react';

interface LeaderboardEntry {
  id: string;
  username: string;
  wins: number;
  elo: number;
}

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, wins, elo')
        .order('elo', { ascending: false })
        .limit(20);

      if (!error && data) {
        setEntries(data as LeaderboardEntry[]);
      }
      setLoading(false);
    };

    fetchLeaderboard();
  }, []);

  return (
    <div className="min-h-[calc(100vh-64px)] p-8 flex justify-center bg-black relative overflow-hidden">
      {/* Background Accents */}
      <div className="absolute top-0 right-0 w-1/3 h-full bg-white/[0.01] pointer-events-none"></div>

      <div className="max-w-4xl w-full relative z-10">
        <header className="text-center mb-32 mt-16 animate-reveal">
          <div className="inline-flex items-center gap-3 px-4 py-1.5 border border-white/20 text-[10px] font-mono tracking-[0.5em] mb-12 uppercase bg-white/5 mx-auto">
             Season 001 ACTIVE
          </div>
          <h1 className="text-7xl font-black text-white mb-6 font-orbitron tracking-tighter uppercase leading-none">Global <span className="opacity-20 underline decoration-white/10 decoration-8">Ranks</span></h1>
          <p className="text-[10px] text-neutral-500 font-mono tracking-[0.6em] uppercase font-bold">Top Tier Operatives — Central Intelligence Ranking</p>
        </header>

        <div className="space-y-px bg-white/10 border border-white/10 animate-reveal delay-150">
          {loading ? (
             <div className="p-32 text-center font-mono text-white opacity-20 uppercase tracking-[0.8em] animate-pulse">Synchronizing Data...</div>
          ) : entries.length > 0 ? (
            entries.map((entry, index) => (
              <div 
                key={entry.id} 
                className="group flex items-center justify-between p-10 bg-black hover:bg-neutral-900 transition-all duration-500"
              >
                <div className="flex items-center gap-12">
                  <span className="text-3xl font-black font-orbitron text-white/10 group-hover:text-white/40 transition-colors w-12 select-none">
                    {index < 9 ? `0${index + 1}` : index + 1}
                  </span>
                  <div>
                    <div className="font-black font-orbitron tracking-widest text-white uppercase text-2xl group-hover:translate-x-2 transition-transform duration-500">
                      {entry.username || 'ANONYMOUS'}
                    </div>
                    {index === 0 && (
                      <div className="text-[9px] text-white font-black uppercase tracking-[0.4em] mt-3 flex items-center gap-2">
                        <Trophy className="w-3 h-3" /> LEAD ARCHITECT
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="font-mono font-black text-white text-3xl tracking-tighter group-hover:scale-110 transition-transform">
                    {Math.floor(entry.elo || 500)}
                  </div>
                  <div className="text-[9px] text-neutral-600 font-mono uppercase tracking-[0.6em] font-bold mt-2">ELo SCORE</div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-32 text-center font-mono text-neutral-600 uppercase tracking-widest bg-black">No Records Logged</div>
          )}
        </div>

        <div className="mt-32 opacity-10 flex justify-center">
            <div className="w-[1px] h-24 bg-white animate-pulse"></div>
        </div>
      </div>
    </div>
  );
}
