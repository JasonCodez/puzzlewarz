'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Rarity, rarityColors } from '@/lib/rarity';
import './profile-actions.css';

interface UserProfile {
  name: string | null;
  email: string | null;
  image: string | null;
  role: string;
  createdAt: string;
  totalPuzzlesSolved: number;
  totalPoints: number;
  rank: number | null;
  xp: number;
  level: number;
  xpTitle: string;
  xpToNextLevel: number;
  xpProgress: number;
  activeTheme: string;
  activeFrame: string;
  activeSkin: string;
  activeFlair: string;
}

// ─── Theme system ───────────────────────────────────────────────────────────
interface ThemeConfig {
  pageBg: string;
  headerGradient: string;
  headerParticle1: string;
  headerParticle2: string;
  primary: string;
  primaryMuted: string;       // primary at ~15% opacity bg
  primaryBorder: string;      // primary border
  secondary: string;
  cardBg: string;
  cardBorder: string;
  statCardBg: string;
  statCardBorder: string;
  accentText: string;
  subtleText: string;
  inputBg: string;
  inputBorder: string;
  btnPrimary: string;
  btnPrimaryText: string;
  xpBarGradient: string;
  avatarRing: string;
  avatarGlow: string;
}

const THEME_CONFIGS: Record<string, ThemeConfig> = {
  default: {
    pageBg: '#020202',
    headerGradient: 'linear-gradient(135deg, rgba(56,145,166,0.25) 0%, rgba(56,145,166,0.10) 50%, rgba(253,231,76,0.06) 100%)',
    headerParticle1: 'rgba(56,145,166,0.25)',
    headerParticle2: 'rgba(253,231,76,0.12)',
    primary: '#3891A6',
    primaryMuted: 'rgba(56,145,166,0.18)',
    primaryBorder: '#3891A6',
    secondary: '#FDE74C',
    cardBg: 'rgba(56,145,166,0.12)',
    cardBorder: '#3891A6',
    statCardBg: 'rgba(56,145,166,0.10)',
    statCardBorder: 'rgba(56,145,166,0.6)',
    accentText: '#FDE74C',
    subtleText: '#AB9F9D',
    inputBg: 'rgba(0,0,0,0.5)',
    inputBorder: '#3891A6',
    btnPrimary: '#3891A6',
    btnPrimaryText: '#fff',
    xpBarGradient: 'linear-gradient(90deg, #3891A6, #38D399)',
    avatarRing: '#FDE74C',
    avatarGlow: 'rgba(253,231,76,0)',
  },
  gold: {
    pageBg: '#0d0900',
    headerGradient: 'linear-gradient(135deg, #2a1a00 0%, #1a1000 50%, #0d0900 100%)',
    headerParticle1: 'rgba(253,231,76,0.35)',
    headerParticle2: 'rgba(255,184,107,0.25)',
    primary: '#FDE74C',
    primaryMuted: 'rgba(253,231,76,0.18)',
    primaryBorder: '#FDE74C',
    secondary: '#FFB86B',
    cardBg: 'rgba(253,231,76,0.08)',
    cardBorder: '#FDE74C',
    statCardBg: 'rgba(255,184,107,0.10)',
    statCardBorder: '#FFB86B',
    accentText: '#FDE74C',
    subtleText: '#c9a84c',
    inputBg: 'rgba(30,20,0,0.7)',
    inputBorder: '#FDE74C',
    btnPrimary: 'linear-gradient(135deg, #FDE74C, #FFB86B)',
    btnPrimaryText: '#1a1000',
    xpBarGradient: 'linear-gradient(90deg, #FDE74C, #FFB86B)',
    avatarRing: '#FDE74C',
    avatarGlow: 'rgba(253,231,76,0.8)',
  },
  neon: {
    pageBg: '#04000e',
    headerGradient: 'linear-gradient(135deg, #0a0020 0%, #04000e 50%, #000a12 100%)',
    headerParticle1: 'rgba(0,255,255,0.35)',
    headerParticle2: 'rgba(204,0,255,0.30)',
    primary: '#00FFFF',
    primaryMuted: 'rgba(0,255,255,0.15)',
    primaryBorder: '#00FFFF',
    secondary: '#CC00FF',
    cardBg: 'rgba(0,255,255,0.07)',
    cardBorder: '#00FFFF',
    statCardBg: 'rgba(204,0,255,0.08)',
    statCardBorder: '#CC00FF',
    accentText: '#00FFFF',
    subtleText: '#8ab8bb',
    inputBg: 'rgba(0,5,20,0.85)',
    inputBorder: '#00FFFF',
    btnPrimary: 'linear-gradient(135deg, #00FFFF, #CC00FF)',
    btnPrimaryText: '#000',
    xpBarGradient: 'linear-gradient(90deg, #00FFFF, #CC00FF)',
    avatarRing: '#00FFFF',
    avatarGlow: 'rgba(0,255,255,0.9)',
  },
  crimson: {
    pageBg: '#0e0000',
    headerGradient: 'linear-gradient(135deg, #2d0000 0%, #1a0000 50%, #0e0000 100%)',
    headerParticle1: 'rgba(220,38,38,0.40)',
    headerParticle2: 'rgba(249,115,22,0.28)',
    primary: '#ef4444',
    primaryMuted: 'rgba(220,38,38,0.18)',
    primaryBorder: '#ef4444',
    secondary: '#F97316',
    cardBg: 'rgba(220,38,38,0.10)',
    cardBorder: '#ef4444',
    statCardBg: 'rgba(249,115,22,0.08)',
    statCardBorder: '#F97316',
    accentText: '#ef4444',
    subtleText: '#b87070',
    inputBg: 'rgba(30,0,0,0.75)',
    inputBorder: '#ef4444',
    btnPrimary: 'linear-gradient(135deg, #DC2626, #F97316)',
    btnPrimaryText: '#fff',
    xpBarGradient: 'linear-gradient(90deg, #DC2626, #F97316)',
    avatarRing: '#DC2626',
    avatarGlow: 'rgba(220,38,38,0.85)',
  },
};

// ─── Frame system ─────────────────────────────────────────────────────────
const FRAME_CONFIGS: Record<string, { ring: string; glow: string; colorA?: string; colorB?: string }> = {
  none:  { ring: '', glow: '' },
  gold:  { ring: 'linear-gradient(135deg, #FDE74C, #FFB86B, #FDE74C)', glow: '0 0 20px rgba(253,231,76,0.7), 0 0 40px rgba(253,231,76,0.3)', colorA: '#FDE74C', colorB: '#FFB86B' },
  neon:  { ring: 'linear-gradient(135deg, #00FFFF, #CC00FF, #00FFFF)',  glow: '0 0 20px rgba(0,255,255,0.7), 0 0 40px rgba(204,0,255,0.4)', colorA: '#00FFFF', colorB: '#CC00FF' },
  flame: { ring: 'linear-gradient(135deg, #FF4500, #FDE74C, #FF4500)',  glow: '0 0 20px rgba(255,69,0,0.8), 0 0 40px rgba(253,231,76,0.4)', colorA: '#FF4500', colorB: '#FDE74C' },
};

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [unlockedBadges, setUnlockedBadges] = useState<Array<{ id: string; title: string; icon: string; rarity: Rarity; unlockedAt?: string }>>([]);
  const [badgesLoading, setBadgesLoading] = useState(true);
  const [showMyPuzzles, setShowMyPuzzles] = useState(false);
  const [myPuzzles, setMyPuzzles] = useState<Array<any>>([]);
  const [myPuzzlesLoading, setMyPuzzlesLoading] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  // Fetch unlocked badges for display on profile
  useEffect(() => {
    if (session?.user?.email) {
      const fetchBadges = async () => {
        setBadgesLoading(true);
        try {
          const res = await fetch('/api/user/achievements');
          if (res.ok) {
            const result = await res.json();
            const unlocked = (result?.achievements || []).filter((a: any) => a.unlocked).map((a: any) => ({
              id: a.id,
              title: a.title,
              icon: a.icon,
              rarity: a.rarity as Rarity,
              unlockedAt: a.unlockedAt,
            }));
            setUnlockedBadges(unlocked);
          }
        } catch (err) {
          console.error('Failed to fetch badges:', err);
        } finally {
          setBadgesLoading(false);
        }
      };
      fetchBadges();
    }
  }, [session?.user?.email]);

  useEffect(() => {
    if (session?.user?.email) {
      fetchProfile();
    }
  }, [session?.user?.email]);

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/user/profile', { cache: 'no-store' });
      const text = await response.text();
      if (!response.ok) {
        console.error('Profile fetch error:', response.status, text);
        setError('Failed to load profile');
        return;
      }
      let data: UserProfile;
      try {
        data = JSON.parse(text);
      } catch {
        console.error('Profile response not JSON:', text.slice(0, 500));
        setError('Failed to load profile');
        return;
      }
      setProfile(data);
      setFormData({ name: data.name || '', email: data.email || '' });
    } catch (error) {
      console.error('Profile fetch error:', (error as Error)?.message ?? String(error));
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const updated = await response.json();
        setProfile(updated);
        setEditing(false);
        setSuccess('Profile updated successfully!');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError('Failed to update profile');
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
      setError('An error occurred');
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        setError('File size must be less than 5MB');
        return;
      }
      setAvatarFile(file);
      const preview = URL.createObjectURL(file);
      setAvatarPreview(preview);
      setError('');
    }
  };

  const handleAvatarUpload = async () => {
    if (!avatarFile) return;

    setUploadingAvatar(true);
    const formData = new FormData();
    formData.append('file', avatarFile);

    try {
      const response = await fetch('/api/user/avatar', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setProfile((prev) => prev ? { ...prev, image: data.image } : null);
        setAvatarFile(null);
        setAvatarPreview(null);
        setSuccess('Avatar updated successfully!');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError('Failed to upload avatar');
      }
    } catch (error) {
      console.error('Failed to upload avatar:', error);
      setError('An error occurred while uploading');
    } finally {
      setUploadingAvatar(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#020202' }}>
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!session?.user) {
    return null;
  }

  const t = THEME_CONFIGS[profile?.activeTheme ?? 'default'] ?? THEME_CONFIGS.default;
  const frame = FRAME_CONFIGS[profile?.activeFrame ?? 'none'] ?? FRAME_CONFIGS.none;
  const flair = profile?.activeFlair && profile.activeFlair !== 'none' ? ` ${profile.activeFlair}` : '';
  const btnStyle = t.btnPrimary.startsWith('linear')
    ? { background: t.btnPrimary, color: t.btnPrimaryText }
    : { backgroundColor: t.btnPrimary, color: t.btnPrimaryText };

  return (
    <main style={{ backgroundColor: t.pageBg, transition: 'background-color 0.4s ease' }} className="min-h-screen">

      {/* Theme accent bar — immediately visible color indicator at the very top */}
      <div className="fixed top-0 left-0 right-0 h-[3px] z-50" style={{ background: t.btnPrimary.startsWith('linear') ? t.btnPrimary : `linear-gradient(90deg, ${t.primary}, ${t.secondary})`, boxShadow: `0 0 12px ${t.avatarGlow}` }} />

      {/* Animated header */}
      <div className="pt-24 pb-20 px-4 relative overflow-hidden" style={{ background: t.headerGradient }}>
        {/* Decorative orbs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full pointer-events-none" style={{ background: t.headerParticle1, filter: 'blur(70px)', transform: 'translateY(-30%)' }} />
        <div className="absolute bottom-0 right-1/4 w-64 h-64 rounded-full pointer-events-none" style={{ background: t.headerParticle2, filter: 'blur(55px)', transform: 'translateY(30%)' }} />
        {/* Bottom border glow */}
        <div className="absolute bottom-0 left-0 right-0 h-[2px]" style={{ background: t.btnPrimary.startsWith('linear') ? t.btnPrimary : `linear-gradient(90deg, transparent, ${t.primary}, transparent)`, opacity: 0.7 }} />
        <div className="max-w-4xl mx-auto relative">
          <div className="flex items-center gap-5">
            {/* Avatar with frame */}
            <div className="relative shrink-0">
              {frame.colorA ? (
                <div
                  className="w-20 h-20 avatar-frame-animated"
                  style={{
                    '--frame-color-a': frame.colorA,
                    '--frame-color-b': frame.colorB,
                    '--frame-inner-bg': t.pageBg,
                    boxShadow: frame.glow,
                  } as React.CSSProperties}
                >
                  <div className="avatar-frame-inner">
                    {profile?.image
                      ? <img src={profile.image} alt="Avatar" className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-3xl" style={{ background: t.primaryMuted }}>👤</div>}
                  </div>
                </div>
              ) : (
                <div className="w-20 h-20 rounded-full overflow-hidden border-[3px]" style={{ borderColor: t.primary, boxShadow: `0 0 18px ${t.avatarGlow}, 0 0 40px ${t.avatarGlow}` }}>
                  {profile?.image
                    ? <img src={profile.image} alt="Avatar" className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-3xl" style={{ background: t.primaryMuted }}>👤</div>}
                </div>
              )}
            </div>
            <div>
              <h1 className="text-4xl font-extrabold text-white mb-1">{profile?.name || 'Player'}{flair}</h1>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm font-semibold px-3 py-1 rounded-full" style={{ backgroundColor: t.primaryMuted, color: t.primary, border: `1px solid ${t.primary}`, boxShadow: `0 0 8px ${t.avatarGlow}` }}>
                  LVL {profile?.level ?? 1} · {profile?.xpTitle ?? 'Newcomer'}
                </span>
                {profile?.role === 'admin' && (
                  <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ backgroundColor: 'rgba(171,159,157,0.2)', color: '#c9b9b7' }}>👑 Admin</span>
                )}
              </div>
              <p className="text-sm mt-1" style={{ color: t.subtleText }}>Member since {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('en-GB', { year: 'numeric', month: 'long' }) : '—'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-10 max-w-4xl mx-auto">
        {error && (
          <div className="mb-6 p-4 rounded-lg text-white border" style={{ backgroundColor: 'rgba(171,159,157,0.15)', borderColor: '#AB9F9D' }}>
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 rounded-xl text-white border" style={{ backgroundColor: t.primaryMuted, borderColor: t.primary }}>
            {success}
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {/* Avatar Card */}
          <div className="border rounded-xl p-6" style={{ backgroundColor: t.cardBg, borderColor: t.cardBorder }}>
            <h3 className="text-lg font-bold text-white mb-6">Avatar</h3>
            <div className="flex flex-col items-center space-y-4">
              {/* Current Avatar with active frame */}
              {frame.colorA ? (
                <div
                  className="w-24 h-24 avatar-frame-animated"
                  style={{
                    '--frame-color-a': frame.colorA,
                    '--frame-color-b': frame.colorB,
                    '--frame-inner-bg': t.pageBg,
                    boxShadow: frame.glow,
                  } as React.CSSProperties}
                >
                  <div className="avatar-frame-inner">
                    {profile?.image
                      ? <img src={profile.image} alt="Avatar" className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-4xl" style={{ background: t.primaryMuted }}>👤</div>}
                  </div>
                </div>
              ) : (
                <div className="w-24 h-24 rounded-full overflow-hidden border-2 flex items-center justify-center" style={{ borderColor: t.avatarRing, boxShadow: `0 0 14px ${t.avatarGlow}` }}>
                  {profile?.image
                    ? <img src={profile.image} alt="Avatar" className="w-full h-full object-cover" />
                    : <span className="text-4xl">👤</span>}
                </div>
              )}

              {/* Avatar Preview */}
              {avatarPreview && (
                <div className="w-20 h-20 rounded-full overflow-hidden border-2" style={{ borderColor: t.primaryBorder }}>
                  <img src={avatarPreview} alt="Avatar Preview" className="w-full h-full object-cover" />
                </div>
              )}

              {/* File Input */}
              <label className="w-full">
                <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                <span className="block w-full px-4 py-2 rounded-lg text-center text-sm font-semibold transition cursor-pointer hover:opacity-90"
                  style={{ background: t.btnPrimary, color: t.btnPrimaryText } as React.CSSProperties}>
                  Choose Image
                </span>
              </label>

              {/* Upload Button */}
              {avatarFile && (
                <button
                  onClick={handleAvatarUpload}
                  disabled={uploadingAvatar}
                  className="w-full px-4 py-2 rounded-lg text-sm font-semibold transition hover:opacity-90 disabled:opacity-50"
                  style={{ background: t.btnPrimary, color: t.btnPrimaryText } as React.CSSProperties}
                >
                  {uploadingAvatar ? 'Uploading...' : 'Upload Avatar'}
                </button>
              )}

              <p className="text-xs" style={{ color: t.subtleText }}>Max 5MB, JPG/PNG</p>
            </div>
          </div>

          {/* Profile Card */}
          <div className="md:col-span-2 md:row-span-2 border rounded-xl p-8" style={{ backgroundColor: t.cardBg, borderColor: t.cardBorder }}>
            <div className="flex items-start justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Account Information</h2>
              <button
                onClick={() => setEditing(!editing)}
                className="px-4 py-2 rounded-lg text-sm font-semibold transition hover:opacity-90"
                style={{ background: t.btnPrimary, color: t.btnPrimaryText } as React.CSSProperties}
              >
                {editing ? 'Cancel' : 'Edit'}
              </button>
            </div>

            {editing ? (
              <form onSubmit={handleUpdate} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: t.accentText }}>
                    Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg border text-white"
                    style={{ backgroundColor: t.inputBg, borderColor: t.inputBorder }}
                    placeholder="Your name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: t.accentText }}>
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    disabled
                    className="w-full px-4 py-2 rounded-lg border text-white opacity-50 cursor-not-allowed"
                    style={{ backgroundColor: t.inputBg, borderColor: t.inputBorder }}
                  />
                  <p className="text-xs mt-1" style={{ color: t.subtleText }}>Email cannot be changed</p>
                </div>

                <button
                  type="submit"
                  className="w-full px-4 py-3 rounded-lg font-semibold transition hover:opacity-90"
                  style={{ background: t.btnPrimary, color: t.btnPrimaryText } as React.CSSProperties}
                >
                  Save Changes
                </button>
              </form>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="text-sm mb-0.5" style={{ color: t.subtleText }}>Name</p>
                  <p className="text-lg font-semibold text-white">{profile?.name || 'Not set'}</p>
                </div>
                <div style={{ borderTopColor: `${t.primaryBorder}40`, borderTopWidth: 1, paddingTop: 16 }}>
                  <p className="text-sm mb-0.5" style={{ color: t.subtleText }}>Email</p>
                  <p className="text-lg font-semibold text-white">{profile?.email}</p>
                </div>
                <div style={{ borderTopColor: `${t.primaryBorder}40`, borderTopWidth: 1, paddingTop: 16 }}>
                  <p className="text-sm mb-0.5" style={{ color: t.subtleText }}>Role</p>
                  <span className="inline-block px-3 py-1 rounded text-sm font-semibold" style={{ backgroundColor: t.primaryMuted, color: t.primary, border: `1px solid ${t.primaryBorder}` }}>
                    {profile?.role === 'admin' ? '👑 Administrator' : '🎮 Player'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Stats Card */}
          <div className="border rounded-xl p-6 space-y-5" style={{ backgroundColor: t.statCardBg, borderColor: t.statCardBorder }}>
            <h3 className="text-lg font-bold text-white">Your Stats</h3>

            {/* Level badge */}
            <div className="flex flex-col items-center gap-1 py-4 rounded-xl" style={{ background: t.primaryMuted, border: `1px solid ${t.primaryBorder}` }}>
              <div className="text-5xl font-black" style={{ color: t.primary, textShadow: `0 0 20px ${t.primary}66` }}>
                {profile?.level ?? 1}
              </div>
              <div className="text-xs font-bold tracking-widest uppercase" style={{ color: t.secondary }}>
                {profile?.xpTitle ?? 'Newcomer'}
              </div>
            </div>

            {/* XP bar */}
            <div>
              <div className="flex justify-between text-xs mb-1.5" style={{ color: t.subtleText }}>
                <span>{profile?.xp ?? 0} XP</span>
                <span>+{profile?.xpToNextLevel ?? 100} to next</span>
              </div>
              <div className="w-full rounded-full overflow-hidden" style={{ height: 7, background: 'rgba(255,255,255,0.07)' }}>
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${Math.min(100, profile?.xpProgress ?? 0)}%`, background: t.xpBarGradient }} />
              </div>
            </div>

            {[
              { label: 'Puzzles Solved', value: profile?.totalPuzzlesSolved ?? 0 },
              { label: 'Total Points',   value: (profile?.totalPoints ?? 0).toLocaleString() },
              { label: 'Global Rank',    value: profile?.rank ? `#${profile.rank}` : '—' },
            ].map(({ label, value }) => (
              <div key={label} style={{ borderTopColor: `${t.primaryBorder}33`, borderTopWidth: 1, paddingTop: 12 }}>
                <p className="text-xs mb-0.5" style={{ color: t.subtleText }}>{label}</p>
                <p className="text-3xl font-extrabold" style={{ color: t.primary }}>{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* My Puzzles */}
        <div className="mb-8">
          <div className="border rounded-xl p-6" style={{ backgroundColor: t.statCardBg, borderColor: t.statCardBorder }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">My Puzzles (Archive)</h3>
              <button
                onClick={async () => {
                  setShowMyPuzzles(!showMyPuzzles);
                  if (!showMyPuzzles && myPuzzles.length === 0) {
                    setMyPuzzlesLoading(true);
                    try {
                      const res = await fetch('/api/user/puzzles');
                      if (res.ok) setMyPuzzles(await res.json());
                    } catch (e) { console.error(e); }
                    finally { setMyPuzzlesLoading(false); }
                  }
                }}
                className="px-4 py-2 rounded-lg text-sm font-semibold transition hover:opacity-90"
                style={{ background: t.btnPrimary, color: t.btnPrimaryText } as React.CSSProperties}
              >
                {showMyPuzzles ? 'Hide' : 'Show'}
              </button>
            </div>
            {showMyPuzzles && (
              myPuzzlesLoading ? (
                <p className="text-sm" style={{ color: t.subtleText }}>Loading...</p>
              ) : myPuzzles.length === 0 ? (
                <p className="text-sm" style={{ color: t.subtleText }}>No archived puzzles yet.</p>
              ) : (
                <div className="space-y-3">
                  {myPuzzles.map((p) => (
                    <div key={p.id} className="border rounded-lg p-3" style={{ borderColor: t.cardBorder, backgroundColor: t.primaryMuted }}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-white text-sm">{p.title}</p>
                          <p className="text-xs" style={{ color: t.subtleText }}>{p.category?.name || 'General'} · {p.difficulty}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-xs px-2 py-1 rounded font-semibold" style={{ backgroundColor: p.solved ? 'rgba(56,201,153,0.12)' : 'rgba(239,68,68,0.08)', color: p.solved ? '#38D399' : '#EF4444' }}>
                            {p.solved ? '✓ Solved' : '✗ Failed'}
                          </span>
                          <div className="text-xs mt-1" style={{ color: t.subtleText }}>{p.attempts ?? 0} attempts</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        </div>

        {/* Unlocked Badges */}
        <div className="mb-8">
          <div className="border rounded-xl p-6" style={{ backgroundColor: t.statCardBg, borderColor: t.statCardBorder }}>
            <h3 className="text-lg font-bold text-white mb-4">🏅 Unlocked Badges</h3>
            {badgesLoading ? (
              <p className="text-sm" style={{ color: t.subtleText }}>Loading badges...</p>
            ) : unlockedBadges.length === 0 ? (
              <p className="text-sm" style={{ color: t.subtleText }}>No badges unlocked yet.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {unlockedBadges.map((b) => {
                  const color = rarityColors[b.rarity] || rarityColors.common;
                  return (
                    <div key={b.id} className="flex flex-col items-center p-3 rounded-xl border" style={{ backgroundColor: color.bg, borderColor: color.border }}>
                      <div className="text-3xl mb-2">{b.icon}</div>
                      <div className="text-sm font-semibold text-center" style={{ color: color.text }}>{b.title}</div>
                      {b.unlockedAt && <div className="text-xs mt-1" style={{ color: t.subtleText }}>{new Date(b.unlockedAt).toLocaleDateString()}</div>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 gap-6">
          <Link
            href="/dashboard"
            className="border rounded-xl p-6 transition hover:scale-[1.02]"
            style={{ backgroundColor: t.cardBg, borderColor: t.cardBorder }}
          >
            <h3 className="text-lg font-bold text-white mb-1">← Back to Dashboard</h3>
            <p style={{ color: t.subtleText }}>Return to your dashboard</p>
          </Link>
          <Link
            href="/store"
            className="border rounded-xl p-6 transition hover:scale-[1.02]"
            style={{ backgroundColor: t.primaryMuted, borderColor: t.primaryBorder }}
          >
            <h3 className="text-lg font-bold text-white mb-1">🛍️ Point Store</h3>
            <p style={{ color: t.subtleText }}>Change your active theme, frame & flair</p>
          </Link>
        </div>
      </div>
    </main>
  );
}
