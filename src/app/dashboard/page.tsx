'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import WelcomeModal from '@/components/WelcomeModal';

interface UserStats {
  totalPuzzlesSolved: number;
  totalPoints: number;
  currentTeams: number;
  rank: number | null;
}

/* ── count-up ─────────────────────────────────────────────── */
function useCountUp(target: number, duration = 1600, trigger = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!trigger || target === 0) { setCount(target); return; }
    let start: number | null = null;
    const step = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      setCount(Math.floor((1 - Math.pow(1 - p, 3)) * target));
      if (p < 1) requestAnimationFrame(step);
      else setCount(target);
    };
    requestAnimationFrame(step);
  }, [target, duration, trigger]);
  return count;
}

/* ── stat card ────────────────────────────────────────────── */
interface StatCardProps {
  label: string;
  value: number | string;
  icon: string;
  color: string;
  bgColor: string;
  borderColor: string;
  prefix?: string;
  suffix?: string;
  delay: number;
  visible: boolean;
  animate?: boolean;
}
function StatCard({ label, value, icon, color, bgColor, borderColor, prefix = '', suffix = '', delay, visible, animate = false }: StatCardProps) {
  const numVal = typeof value === 'number' ? value : 0;
  const counted = useCountUp(numVal, 1400, animate && visible);
  const displayVal = typeof value === 'string' ? value : counted;
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        backgroundColor: bgColor,
        border: `1px solid ${hovered ? color : borderColor}`,
        borderRadius: 16,
        padding: '24px',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(24px)',
        transition: `opacity 0.6s ease ${delay}s, transform 0.6s ease ${delay}s, border-color 0.25s, box-shadow 0.25s`,
        boxShadow: hovered ? `0 8px 32px ${bgColor}` : 'none',
        cursor: 'default',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color }}>{label}</p>
        <div style={{ width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, backgroundColor: bgColor, border: `1px solid ${borderColor}` }}>
          {icon}
        </div>
      </div>
      <p style={{ fontSize: 36, fontWeight: 800, color: '#fff', lineHeight: 1, letterSpacing: '-0.02em' }}>
        {prefix}{displayVal}{suffix}
      </p>
    </div>
  );
}

/* ── action card ──────────────────────────────────────────── */
interface ActionCardProps {
  href: string;
  icon: string;
  title: string;
  desc: string;
  accent: 'teal' | 'gold' | 'muted';
  delay: number;
  visible: boolean;
  badge?: string;
}
function ActionCard({ href, icon, title, desc, accent, delay, visible, badge }: ActionCardProps) {
  const [hovered, setHovered] = useState(false);
  const colors = {
    teal:  { bg: 'rgba(0,212,255,0.10)',  border: 'rgba(0,212,255,0.35)',  hover: 'rgba(0,212,255,0.65)',  glow: 'rgba(0,212,255,0.25)',  icon: 'rgba(0,212,255,0.20)',  iconBorder: 'rgba(0,212,255,0.4)',  accent: '#00D4FF' },
    gold:  { bg: 'rgba(255,215,0,0.08)',  border: 'rgba(255,215,0,0.32)',  hover: 'rgba(255,215,0,0.6)',   glow: 'rgba(255,215,0,0.20)', icon: 'rgba(255,215,0,0.14)',  iconBorder: 'rgba(255,215,0,0.35)', accent: '#FFD700' },
    muted: { bg: 'rgba(167,139,250,0.08)', border: 'rgba(167,139,250,0.28)',  hover: 'rgba(167,139,250,0.55)',  glow: 'rgba(167,139,250,0.20)',icon: 'rgba(167,139,250,0.16)', iconBorder: 'rgba(167,139,250,0.35)',accent: '#A78BFA' },
  };
  const c = colors[accent];

  return (
    <Link
      href={href}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'block',
        textDecoration: 'none',
        backgroundColor: c.bg,
        border: `1px solid ${hovered ? c.hover : c.border}`,
        borderRadius: 16,
        padding: '24px',
        opacity: visible ? 1 : 0,
        transform: visible ? (hovered ? 'translateY(-5px)' : 'translateY(0)') : 'translateY(28px)',
        transition: `opacity 0.6s ease ${delay}s, transform 0.5s ease ${delay}s, border-color 0.22s, box-shadow 0.22s`,
        boxShadow: hovered ? `0 12px 40px ${c.glow}` : 'none',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {badge && (
        <span style={{
          position: 'absolute', top: 14, right: 14,
          fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
          padding: '3px 8px', borderRadius: 999,
          backgroundColor: 'rgba(253,231,76,0.12)', color: '#FDE74C', border: '1px solid rgba(253,231,76,0.25)',
        }}>{badge}</span>
      )}
      <div style={{
        width: 48, height: 48, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 22, marginBottom: 16,
        backgroundColor: c.icon, border: `1px solid ${c.iconBorder}`,
        transition: 'transform 0.22s',
        transform: hovered ? 'scale(1.1)' : 'scale(1)',
      }}>
        {icon}
      </div>
      <h3 style={{ color: '#fff', fontWeight: 700, fontSize: 16, marginBottom: 6 }}>{title}</h3>
      <p style={{ color: '#6B7280', fontSize: 13, lineHeight: 1.5 }}>{desc}</p>
      <div style={{
        marginTop: 16, fontSize: 12, fontWeight: 600, color: c.accent,
        display: 'flex', alignItems: 'center', gap: 4,
        opacity: hovered ? 1 : 0.5, transition: 'opacity 0.22s',
      }}>
        Open <span style={{ transition: 'transform 0.22s', transform: hovered ? 'translateX(3px)' : 'none' }}>→</span>
      </div>
    </Link>
  );
}

export default function Dashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user?.email) {
      Promise.all([fetchUserStats(), fetchAdminStatus()]).finally(() => {
        setLoading(false);
        setTimeout(() => setMounted(true), 60);
      });
    }
  }, [session?.user?.email]);

  const fetchUserStats = async () => {
    try {
      const response = await fetch('/api/user/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch user stats:', error);
    }
  };

  const fetchAdminStatus = async () => {
    try {
      const response = await fetch('/api/admin/check');
      if (response.ok) {
        const data = await response.json();
        setIsAdmin(data.isAdmin);
      }
    } catch (error) {
      console.error('Failed to check admin status:', error);
    }
  };

  /* ── Loading skeleton ─────────────────────────────────── */
  if (status === 'loading' || loading) {
    return (
      <div style={{ backgroundColor: '#020202', minHeight: '100vh' }}>
        <Navbar />
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '100px 16px 48px' }}>
          {/* Header skeleton */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 48 }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', backgroundColor: 'rgba(56,145,166,0.12)', animation: 'pulse 1.5s ease-in-out infinite' }} />
            <div>
              <div style={{ width: 200, height: 22, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.06)', marginBottom: 10, animation: 'pulse 1.5s ease-in-out infinite' }} />
              <div style={{ width: 140, height: 14, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.04)', animation: 'pulse 1.5s ease-in-out infinite' }} />
            </div>
          </div>
          {/* Stat skeleton */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 20, marginBottom: 48 }}>
            {[0,1,2,3].map(i => (
              <div key={i} style={{ height: 108, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', animation: `pulse 1.5s ease-in-out ${i * 0.1}s infinite` }} />
            ))}
          </div>
          {/* Card skeleton */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 20 }}>
            {[0,1,2,3,4,5].map(i => (
              <div key={i} style={{ height: 160, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', animation: `pulse 1.5s ease-in-out ${i * 0.08}s infinite` }} />
            ))}
          </div>
        </div>
        <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
      </div>
    );
  }

  if (!session?.user) return null;

  const initials = (session.user.name || session.user.email || 'P')
    .split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();

  const statCards = [
    { label: 'Puzzles Solved', value: stats?.totalPuzzlesSolved ?? 0, icon: '🧩', color: '#00D4FF', bgColor: 'rgba(0,212,255,0.12)', borderColor: 'rgba(0,212,255,0.35)', animate: true },
    { label: 'Total Points',   value: stats?.totalPoints ?? 0,        icon: '⚡', color: '#FFD700', bgColor: 'rgba(255,215,0,0.10)',  borderColor: 'rgba(255,215,0,0.32)',  animate: true },
    { label: 'Active Teams',   value: stats?.currentTeams ?? 0,       icon: '👥', color: '#A78BFA', bgColor: 'rgba(167,139,250,0.10)', borderColor: 'rgba(167,139,250,0.30)', animate: true },
    { label: 'Global Rank',    value: stats?.rank ? `#${stats.rank}` : 'Unranked', icon: '🏆', color: '#F97316', bgColor: 'rgba(249,115,22,0.10)', borderColor: 'rgba(249,115,22,0.30)', animate: false },
  ];

  const coreCards = [
    { href: '/puzzles',             icon: '🧩', title: 'Solve Puzzles',       desc: 'Dive into active puzzles and earn points',                  accent: 'teal'  as const },
    { href: '/warz',                icon: '⚔️', title: 'Warz',                desc: 'Challenge rivals head-to-head. Wager points on speed.',      accent: 'gold'  as const, badge: 'Live' },
    { href: '/teams',               icon: '👥', title: 'My Teams',            desc: 'Manage your teams and invite players to collaborate.',       accent: 'gold'  as const },
    { href: '/leaderboards',        icon: '🏆', title: 'Leaderboards',        desc: 'Check global rankings and see where you stand.',             accent: 'teal'  as const },
    { href: '/categories',          icon: '📚', title: 'Browse Categories',   desc: 'Explore puzzles organised by topic and difficulty.',         accent: 'gold'  as const },
    { href: '/achievements',        icon: '🎖️', title: 'Achievements',        desc: 'Unlock badges and earn recognition as you progress.',        accent: 'muted' as const },
    { href: '/profile',             icon: '👤', title: 'My Profile',          desc: 'View your stats, badges, and customise your profile.',       accent: 'teal'  as const },
    { href: '/dashboard/activity',  icon: '📋', title: 'Activity Feed',       desc: 'Review your recent actions and account history.',            accent: 'muted' as const },
    { href: '/daily',               icon: '📅', title: 'Daily Challenge',     desc: 'Tackle today\'s featured puzzle and keep your streak alive.', accent: 'gold'  as const },
    { href: '/faq',                 icon: '❓', title: 'FAQ',                 desc: 'Answers to common questions about puzzles, teams, and more.', accent: 'muted' as const },
  ];

  const adminCards = [
    { href: '/admin/analytics', icon: '📊', title: 'Analytics',      desc: 'View platform statistics and puzzle analytics.',         accent: 'teal' as const },
    { href: '/admin/puzzles',   icon: '➕', title: 'Create Puzzle',  desc: 'Add new puzzles to the platform.',                       accent: 'muted' as const },
  ];

  return (
    <>
      <style>{`
        @keyframes db-fade-in { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes db-pulse { 0%,100%{opacity:1} 50%{opacity:0.45} }
        @keyframes db-glow { 0%,100%{box-shadow:0 0 0 0 rgba(56,145,166,0)} 50%{box-shadow:0 0 0 6px rgba(56,145,166,0)} }
      `}</style>

      <main style={{ backgroundColor: '#020202', minHeight: '100vh' }}>
        <Navbar />

        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '100px 16px 64px' }}>

          {/* ── Welcome header ─────────────────────────────── */}
          <div style={{
            display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between',
            gap: 20, marginBottom: 48,
            opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(20px)',
            transition: 'opacity 0.6s ease, transform 0.6s ease',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
              {/* Avatar */}
              <div style={{ position: 'relative', flexShrink: 0 }}>
                {session.user.image ? (
                  <img src={session.user.image} alt="avatar" style={{ width: 60, height: 60, borderRadius: '50%', border: '2px solid rgba(56,145,166,0.5)', objectFit: 'cover' }} />
                ) : (
                  <div style={{
                    width: 60, height: 60, borderRadius: '50%',
                    background: 'linear-gradient(135deg, rgba(56,145,166,0.35) 0%, rgba(56,145,166,0.15) 100%)',
                    border: '2px solid rgba(56,145,166,0.4)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 20, fontWeight: 800, color: '#9BD1D6',
                  }}>{initials}</div>
                )}
                {/* Online dot */}
                <div style={{
                  position: 'absolute', bottom: 2, right: 2, width: 12, height: 12,
                  borderRadius: '50%', backgroundColor: '#22c55e',
                  border: '2px solid #020202', boxShadow: '0 0 6px rgba(34,197,94,0.6)',
                }} />
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <h1 style={{ fontSize: 'clamp(20px, 3vw, 28px)', fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '-0.01em' }}>
                    Welcome back, {session.user.name?.split(' ')[0] || 'Player'}
                  </h1>
                  {isAdmin && (
                    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '3px 8px', borderRadius: 999, backgroundColor: 'rgba(253,231,76,0.1)', color: '#FDE74C', border: '1px solid rgba(253,231,76,0.25)' }}>
                      Admin
                    </span>
                  )}
                </div>
                <p style={{ color: '#6B7280', fontSize: 14, margin: 0 }}>
                  {stats?.rank ? `Global Rank #${stats.rank} · ` : ''}{stats?.totalPoints?.toLocaleString() || 0} pts
                </p>
              </div>
            </div>

          </div>

          {/* ── Stat cards ──────────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16, marginBottom: 48 }}>
            {statCards.map((s, i) => (
              <StatCard key={i} {...s} delay={0.08 + i * 0.1} visible={mounted} />
            ))}
          </div>

          {/* ── Core nav cards ──────────────────────────────── */}
          <div style={{ marginBottom: isAdmin ? 48 : 0 }}>
            <p style={{
              fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase',
              color: '#374151', marginBottom: 20,
              opacity: mounted ? 1 : 0, transition: 'opacity 0.6s ease 0.4s',
            }}>
              Navigate
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
              {coreCards.map((c, i) => (
                <ActionCard key={i} {...c} delay={0.12 + i * 0.07} visible={mounted} />
              ))}
            </div>
          </div>

          {/* ── Coming Soon ────────────────────────────────── */}
          <div style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(18px)',
            transition: 'opacity 0.6s ease 0.7s, transform 0.6s ease 0.7s',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <p style={{
                fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase',
                color: '#7C3AED', margin: 0,
              }}>
                Coming Soon
              </p>
              <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, rgba(124,58,237,0.35), transparent)' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
              {[
                { icon: '🚪', title: 'Escape Rooms',     desc: 'Multi-stage collaborative rooms with inventory, clues, and timed challenges.',     color: '#7C3AED' },
                { icon: '🕵️', title: 'Detective Cases',  desc: 'Noir-style investigations with a one-strike lockout. Make your accusation count.',  color: '#EF4444' },
                { icon: '🌐', title: 'ARG Puzzles',      desc: 'Alternate Reality Games — ciphers, steganography, and multi-step trails.',           color: '#3891A6' },
              ].map((cs, i) => (
                <div
                  key={cs.title}
                  style={{
                    position: 'relative',
                    backgroundColor: `${cs.color}0C`,
                    border: `1px solid ${cs.color}35`,
                    borderRadius: 16,
                    padding: '24px',
                    opacity: mounted ? 0.85 : 0,
                    transform: mounted ? 'translateY(0)' : 'translateY(28px)',
                    transition: `opacity 0.6s ease ${0.75 + i * 0.08}s, transform 0.5s ease ${0.75 + i * 0.08}s`,
                    overflow: 'hidden',
                  }}
                >
                  {/* Badge */}
                  <span style={{
                    position: 'absolute', top: 14, right: 14,
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
                    padding: '3px 10px', borderRadius: 999,
                    color: cs.color, backgroundColor: `${cs.color}14`, border: `1px solid ${cs.color}30`,
                  }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: cs.color, boxShadow: `0 0 6px ${cs.color}`, animation: 'db-pulse 2s ease-in-out infinite' }} />
                    Soon
                  </span>

                  <div style={{
                    width: 48, height: 48, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 22, marginBottom: 16,
                    backgroundColor: `${cs.color}14`, border: `1px solid ${cs.color}28`,
                  }}>
                    {cs.icon}
                  </div>
                  <h3 style={{ color: '#fff', fontWeight: 700, fontSize: 16, marginBottom: 6 }}>{cs.title}</h3>
                  <p style={{ color: '#6B7280', fontSize: 13, lineHeight: 1.5 }}>{cs.desc}</p>
                  <div style={{ marginTop: 16, fontSize: 12, fontWeight: 600, color: cs.color, display: 'flex', alignItems: 'center', gap: 4, opacity: 0.6 }}>
                    Launching soon <span>⏳</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Admin cards ─────────────────────────────────── */}
          {isAdmin && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <p style={{
                  fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase',
                  color: '#FDE74C', margin: 0,
                  opacity: mounted ? 1 : 0, transition: 'opacity 0.6s ease 0.5s',
                }}>
                  Admin
                </p>
                <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, rgba(253,231,76,0.25), transparent)', opacity: mounted ? 1 : 0, transition: 'opacity 0.6s ease 0.6s' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
                {adminCards.map((c, i) => (
                  <ActionCard key={i} {...c} delay={0.2 + i * 0.1} visible={mounted} />
                ))}
              </div>
            </div>
          )}

        </div>
      </main>

      <WelcomeModal
        userName={session.user.name?.split(' ')[0] || 'Solver'}
        userId={(session.user as { id?: string }).id || session.user.email || 'guest'}
      />
    </>
  );
}
