'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function TopNav({ active }: { active: string }) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const links = [
    { id: 'arena', label: 'Arena', path: '/' },
    { id: 'rankings', label: 'Rankings', path: '/leaderboard' },
    { id: 'career', label: 'Career', path: '/career' },
    { id: 'hub', label: 'Hub', path: '/hub' },
  ];

  return (
    <>
      <header style={{
        position: 'fixed', top: 0, width: '100%', zIndex: 50,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '0 24px', minHeight: 80,
        background: 'rgba(14,14,16,0.80)',
        backdropFilter: 'blur(40px)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}>
        <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.03em', color: '#A7A9CC', fontStyle: 'italic', cursor: 'pointer', zIndex: 60 }}
          onClick={() => { setMenuOpen(false); router.push('/'); }}>
          Clashvers
        </div>

        {/* Desktop Nav */}
        <nav className="hide-on-mobile" style={{ alignItems: 'center', gap: 32 }}>
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

        {/* Desktop Action & Mobile Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, zIndex: 60 }}>
          <button className="hide-on-mobile" onClick={() => router.push('/')} style={{ padding: '10px 24px', background: 'var(--primary)', color: 'var(--on-primary)', fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 600, border: 'none', borderRadius: 10, cursor: 'pointer', letterSpacing: '-0.01em' }}>Battle Now</button>
          
          <button className="hide-on-desktop" style={{ justifyContent: 'center', alignItems: 'center', width: 40, height: 40, borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', cursor: 'pointer' }} onClick={() => setMenuOpen(!menuOpen)}>
            <span className="material-symbols-outlined">{menuOpen ? 'close' : 'menu'}</span>
          </button>
        </div>
      </header>

      {/* Mobile Menu Window */}
      {menuOpen && (
        <div className="hide-on-desktop" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 40, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(16px)', paddingTop: 100, paddingLeft: 24, paddingRight: 24, flexDirection: 'column', gap: 24 }} onClick={() => setMenuOpen(false)}>
           <div style={{ display: 'flex', flexDirection: 'column', gap: 8, background: '#131315', padding: 24, borderRadius: 24, border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }} onClick={e => e.stopPropagation()}>
              <h2 style={{ color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.15em', fontWeight: 700, marginBottom: 8, marginLeft: 8 }}>Navigation</h2>
              {links.map(link => {
                const isActive = active === link.id;
                return (
                  <button key={link.id} onClick={() => { setMenuOpen(false); router.push(link.path); }}
                    style={{ textAlign: 'left', padding: 16, borderRadius: 16, fontSize: 18, fontWeight: 700, transition: 'all 0.2s', border: 'none', cursor: 'pointer', background: isActive ? 'rgba(167,169,204,0.1)' : 'transparent', color: isActive ? '#c2c4e8' : 'rgba(255,255,255,0.8)' }}>
                    {link.label}
                  </button>
                );
              })}
              <button onClick={() => { setMenuOpen(false); router.push('/'); }} style={{ marginTop: 16, padding: 16, borderRadius: 16, background: '#c2c4e8', color: '#131315', fontWeight: 700, fontSize: 18, textAlign: 'center', border: 'none', cursor: 'pointer' }}>
                Battle Now
              </button>
           </div>
        </div>
      )}
    </>
  );
}
