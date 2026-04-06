"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import NotificationBell from "@/components/notifications/NotificationBell";
import MessagesBell from "@/components/notifications/MessagesBell";

function Hamburger({ open, setOpen }: { open: boolean; setOpen: (v: boolean) => void }) {
  return (
    <button
      className="hamburger-button flex nav:hidden flex-col justify-center items-center w-10 h-10 focus:outline-none"
      aria-label={open ? 'Close menu' : 'Open menu'}
      onClick={() => setOpen(!open)}
    >
      <span
        className={`block h-0.5 w-6 rounded bg-white transition-all duration-300 ${open ? 'rotate-45 translate-y-2' : ''}`}
      ></span>
      <span
        className={`block h-0.5 w-6 rounded bg-white my-1 transition-all duration-300 ${open ? 'opacity-0' : ''}`}
      ></span>
      <span
        className={`block h-0.5 w-6 rounded bg-white transition-all duration-300 ${open ? '-rotate-45 -translate-y-2' : ''}`}
      ></span>
    </button>
  );
}

interface UserInfo {
  id: string;
  role: string;
  image?: string | null;
  level?: number;
  title?: string;
  currentXp?: number;
  nextLevelXp?: number;
  progress?: number;
  activeFlair?: string | null;
}


export default function Navbar() {
  const { data: session } = useSession();
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    if (session?.user?.email) {
      fetchUserInfo();
    } else {
      setLoading(false);
    }
  }, [session?.user?.email]);

  // Re-fetch whenever XP is awarded (e.g. after puzzle completion)
  useEffect(() => {
    const handler = () => fetchUserInfo();
    window.addEventListener('puzzlewarz:xp-updated', handler);
    return () => window.removeEventListener('puzzlewarz:xp-updated', handler);
  }, []);

  const fetchUserInfo = async () => {
    try {
      const response = await fetch("/api/user/info");
      if (response.ok) {
        const data = await response.json();
        setUserInfo(data);
      } else {
        console.error("Failed to fetch user info:", response.status, response.statusText);
      }
    } catch (error) {
      console.error("Failed to fetch user info:", error);
    } finally {
      setLoading(false);
    }
  };

  const getUserId = () => {
    const sessionUser = session?.user as { id?: string } | undefined;
    const id = userInfo?.id || sessionUser?.id || "";
    return id;
  };

  const handleSignOut = async () => {
    try {
      // Use NextAuth client signOut to properly clear cookies and session
      await signOut({ callbackUrl: '/auth/signin?logout=true' });
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <>
    <nav
      id="global-nav"
      className={`fixed w-full top-0 z-50 backdrop-blur-md${mobileOpen ? ' nav-mobile-open' : ''}`}
      style={{
        backgroundColor: "rgba(2, 4, 8, 0.82)",
        borderBottom: "1px solid rgba(56, 145, 166, 0.3)",
        boxShadow: "0 1px 0 rgba(56,145,166,0.06)",
      }}
    >
      <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
        {/* Logo: disabled link when signed in */}
        {session ? (
          <div className="flex items-center gap-3 opacity-80 select-none" aria-disabled="true" role="img" tabIndex={-1}>
              <img src="/images/puzzle_warz_logo.png" alt="Puzzle Warz Logo" className="h-9 w-auto" />
            <div className="text-xs font-bold tracking-widest uppercase" style={{ color: "#3891A6" }}>
              Puzzle Warz
            </div>
          </div>
        ) : (
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition">
              <img src="/images/puzzle_warz_logo.png" alt="Puzzle Warz Logo" className="h-9 w-auto" />
            <div className="text-xs font-bold tracking-widest uppercase" style={{ color: "#3891A6" }}>
              Puzzle Warz
            </div>
          </Link>
        )}

        {/* Hamburger for mobile */}
        <Hamburger open={mobileOpen} setOpen={setMobileOpen} />

        {/* Center Navigation - Only for authenticated users (desktop) */}
        {session && !mobileOpen && (
          <div className="desktop-nav hidden nav:flex items-center">
            <Link href="/dashboard" className="px-2.5 py-2 text-zinc-400 hover:text-white text-sm font-medium transition-colors duration-200">Dashboard</Link>
            <Link href="/puzzles" className="px-2.5 py-2 text-zinc-400 hover:text-white text-sm font-medium transition-colors duration-200">Puzzles</Link>
            <Link href="/daily" className="px-2.5 py-2 text-zinc-400 hover:text-white text-sm font-medium transition-colors duration-200 flex items-center gap-1">Daily <span>🟩</span></Link>
            <Link href="/warz" className="px-2.5 py-2 text-sm font-bold transition-colors duration-200 flex items-center gap-1" style={{ color: "#FDE74C" }}><span>⚔️</span>Warz</Link>
            <Link href="/store" className="px-2.5 py-2 text-sm font-bold transition-colors duration-200 flex items-center gap-1" style={{ color: "#a78bfa" }}><span>🛍️</span>Store</Link>
            {/* More dropdown */}
            <div className="relative">
              <button
                onClick={() => setMoreOpen(o => !o)}
                onBlur={() => setTimeout(() => setMoreOpen(false), 150)}
                className="px-2.5 py-2 text-zinc-400 hover:text-white text-sm font-medium transition-colors duration-200 flex items-center gap-1"
              >
                More <span className="text-xs">{moreOpen ? '▲' : '▼'}</span>
              </button>
              {moreOpen && (
                <div
                  className="absolute top-full left-0 mt-1 rounded-lg py-1 z-50 min-w-[160px]"
                  style={{ backgroundColor: 'rgba(10,14,20,0.97)', border: '1px solid rgba(56,145,166,0.3)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}
                >
                  <Link href="/leaderboards" className="block px-4 py-2 text-zinc-300 hover:text-white hover:bg-white/5 text-sm transition-colors" onClick={() => setMoreOpen(false)}>Leaderboards</Link>
                  <Link href="/teams" className="block px-4 py-2 text-zinc-300 hover:text-white hover:bg-white/5 text-sm transition-colors" onClick={() => setMoreOpen(false)}>Teams</Link>
                  <Link href="/achievements" className="block px-4 py-2 text-zinc-300 hover:text-white hover:bg-white/5 text-sm transition-colors" onClick={() => setMoreOpen(false)}>Achievements</Link>
                  <Link href="/learn" className="block px-4 py-2 text-zinc-300 hover:text-white hover:bg-white/5 text-sm transition-colors" onClick={() => setMoreOpen(false)}>Learn</Link>
                  <Link href="/forum" className="block px-4 py-2 text-zinc-300 hover:text-white hover:bg-white/5 text-sm transition-colors" onClick={() => setMoreOpen(false)}>Forum</Link>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Right Side (desktop) */}
        {!mobileOpen && (
          <div className="desktop-nav hidden nav:flex items-center gap-4">
            {session && !loading ? (
              <>
                <NotificationBell onActivate={() => setMobileOpen(false)} />
                <MessagesBell onActivate={() => setMobileOpen(false)} />
                {userInfo?.image && (
                  <img
                    src={userInfo.image}
                    alt="Avatar"
                    className="h-8 w-8 rounded-full object-cover"
                    onError={(e) => {
                      const img = e.currentTarget as HTMLImageElement;
                      img.onerror = null;
                      img.src = '/images/default-avatar.svg';
                    }}
                  />
                )}
                <div className="hidden sm:block text-right">
                  <p className="text-white font-semibold text-sm max-w-[140px] truncate">{session.user?.name || session.user?.email}{userInfo?.activeFlair ? <span style={{ display: 'inline-block', transform: 'translateY(-1px)' }}> {userInfo.activeFlair}</span> : ""}</p>
                  {userInfo?.level !== undefined ? (
                    <>
                      <p className="text-xs" style={{ color: "#818cf8" }}>Lv.{userInfo.level} · {userInfo.title}</p>
                      <div className="mt-0.5 h-1 w-28 rounded-full overflow-hidden" style={{ background: "rgba(129,140,248,0.15)" }}>
                        <div className="h-full rounded-full transition-all" style={{ width: `${userInfo.progress ?? 0}%`, background: "linear-gradient(90deg, #818cf8, #c084fc)" }} />
                      </div>
                    </>
                  ) : (
                    <p style={{ color: "#3891A6" }} className="text-xs">Player</p>
                  )}
                </div>
                <Link href="/profile" className="px-3 py-2 rounded-md text-sm font-semibold transition-all duration-200 hover:brightness-110" style={{ backgroundColor: "#3891A6", color: "#020202" }}>Profile</Link>
                <button onClick={handleSignOut} className="px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 hover:opacity-80" style={{ backgroundColor: "rgba(220,38,38,0.12)", border: "1px solid rgba(220,38,38,0.3)", color: "#fca5a5" }}>Sign Out</button>
              </>
            ) : (
              <>
                <Link href="/auth/signin" className="px-3 py-2 rounded text-white text-sm transition hover:opacity-90" style={{ backgroundColor: "rgba(56, 145, 166, 0.8)" }}>Sign In</Link>
                <Link href="/auth/register" className="px-3 py-2 rounded text-white text-sm font-semibold transition hover:opacity-90" style={{ backgroundColor: "#3891A6" }}>Join Now</Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>

      {/* Mobile Menu Overlay */}
      <div
        className={`fixed inset-0 z-40 bg-black bg-opacity-60 transition-opacity duration-300 ${mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setMobileOpen(false)}
        aria-hidden={!mobileOpen}
      ></div>
      {/* Mobile Menu Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-full sm:w-72 max-w-full z-50 shadow-2xl transform transition-transform duration-300 ${mobileOpen ? 'translate-x-0' : 'translate-x-full'}`}
        style={{ borderLeft: '1px solid rgba(56,145,166,0.35)', backgroundColor: '#0c1014', isolation: 'isolate' }}
        role="dialog"
        aria-modal="true"
        aria-label="Mobile navigation menu"
      >
        <div className="flex flex-col h-full p-6 gap-6 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <img src="/images/puzzle_warz_logo.png" alt="Puzzle Warz Logo" className="h-12 w-auto" />
              <span className="text-xs font-bold tracking-widest uppercase" style={{ color: '#3891A6' }}>Puzzle Warz</span>
            </div>
            <button onClick={() => setMobileOpen(false)} aria-label="Close menu" className="text-white text-2xl focus:outline-none">&times;</button>
          </div>
          <nav className="flex flex-col gap-3">
            {session ? (
              <>
                <Link href="/dashboard" className="py-2.5 px-4 rounded-lg text-zinc-300 hover:text-[#3891A6] hover:bg-white/5 text-base font-medium transition-colors duration-200" onClick={() => setMobileOpen(false)}>Dashboard</Link>
                <Link href="/puzzles" className="py-2.5 px-4 rounded-lg text-zinc-300 hover:text-[#3891A6] hover:bg-white/5 text-base font-medium transition-colors duration-200" onClick={() => setMobileOpen(false)}>Puzzles</Link>
                <Link href="/daily" className="py-2.5 px-4 rounded-lg text-zinc-300 hover:text-[#3891A6] hover:bg-white/5 text-base font-medium transition-colors duration-200 flex items-center gap-1" onClick={() => setMobileOpen(false)}>Daily <span>🟩</span></Link>
                <Link href="/warz" className="py-2.5 px-4 rounded-lg text-base font-bold transition-colors duration-200 flex items-center gap-1" style={{ color: "#FDE74C" }} onClick={() => setMobileOpen(false)}><span>⚔️</span>Warz</Link>
                <Link href="/store" className="py-2.5 px-4 rounded-lg text-base font-bold transition-colors duration-200 flex items-center gap-1" style={{ color: "#a78bfa" }} onClick={() => setMobileOpen(false)}><span>🛍️</span>Store</Link>
                <Link href="/learn" className="py-2.5 px-4 rounded-lg text-zinc-300 hover:text-[#3891A6] hover:bg-white/5 text-base font-medium transition-colors duration-200" onClick={() => setMobileOpen(false)}>Learn</Link>
                <Link href="/forum" className="py-2.5 px-4 rounded-lg text-zinc-300 hover:text-[#3891A6] hover:bg-white/5 text-base font-medium transition-colors duration-200" onClick={() => setMobileOpen(false)}>Forum</Link>
                <Link href="/leaderboards" className="py-2.5 px-4 rounded-lg text-zinc-300 hover:text-[#3891A6] hover:bg-white/5 text-base font-medium transition-colors duration-200" onClick={() => setMobileOpen(false)}>Leaderboards</Link>
                <Link href="/teams" className="py-2.5 px-4 rounded-lg text-zinc-300 hover:text-[#3891A6] hover:bg-white/5 text-base font-medium transition-colors duration-200" onClick={() => setMobileOpen(false)}>Teams</Link>
                <Link href="/achievements" className="py-2.5 px-4 rounded-lg text-zinc-300 hover:text-[#3891A6] hover:bg-white/5 text-base font-medium transition-colors duration-200" onClick={() => setMobileOpen(false)}>Achievements</Link>
                <Link href="/profile" className="py-2.5 px-4 rounded-lg font-semibold text-base transition-all duration-200 hover:brightness-110" style={{ backgroundColor: '#3891A6', color: '#020202' }} onClick={() => setMobileOpen(false)}>Profile</Link>
                <button onClick={() => { setMobileOpen(false); handleSignOut(); }} className="py-2.5 px-4 rounded-lg text-base font-medium transition-all duration-200 hover:opacity-80 text-left" style={{ backgroundColor: 'rgba(220,38,38,0.12)', border: '1px solid rgba(220,38,38,0.3)', color: '#fca5a5' }}>Sign Out</button>
              </>
            ) : (
              <>
                <Link href="/auth/signin" className="py-2.5 px-4 rounded-lg text-zinc-300 hover:text-[#3891A6] hover:bg-white/5 text-base font-medium transition-colors duration-200" onClick={() => setMobileOpen(false)}>Sign In</Link>
                <Link href="/auth/register" className="py-2.5 px-4 rounded-lg text-base font-bold transition-all duration-200 hover:brightness-110" style={{ backgroundColor: '#3891A6', color: '#020202' }} onClick={() => setMobileOpen(false)}>Join Now</Link>
              </>
            )}
          </nav>
          {session && !loading && (
            <div className="mt-auto flex items-center gap-3 border-t border-brand-teal pt-4">
              <NotificationBell onActivate={() => setMobileOpen(false)} />
              <MessagesBell onActivate={() => setMobileOpen(false)} />
              {userInfo?.image && (
                <img
                  src={userInfo.image}
                  alt="Avatar"
                  className="h-8 w-8 rounded-full object-cover"
                  onError={(e) => {
                    const img = e.currentTarget as HTMLImageElement;
                    img.onerror = null;
                    img.src = '/images/default-avatar.svg';
                  }}
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm truncate">{session.user?.name || session.user?.email}{userInfo?.activeFlair ? <span style={{ display: 'inline-block', transform: 'translateY(-1px)' }}> {userInfo.activeFlair}</span> : ""}</p>
                {userInfo?.level !== undefined ? (
                  <>
                    <p className="text-xs" style={{ color: "#818cf8" }}>Lv.{userInfo.level} · {userInfo.title}</p>
                    <div className="mt-1 h-1.5 w-full rounded-full overflow-hidden" style={{ background: "rgba(129,140,248,0.15)" }}>
                      <div className="h-full rounded-full transition-all" style={{ width: `${userInfo.progress ?? 0}%`, background: "linear-gradient(90deg, #818cf8, #c084fc)" }} />
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: "#475569" }}>{userInfo.currentXp} / {userInfo.nextLevelXp} XP</p>
                  </>
                ) : (
                  <p style={{ color: "#3891A6" }} className="text-xs">Player</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
