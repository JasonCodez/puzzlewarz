"use client";

import React, { useState, useEffect } from "react";
import "./profile-actions.css";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import ConfirmModal from '@/components/ConfirmModal';
import { Rarity, rarityColors } from '@/lib/rarity';
import {
  UserPlus,
  UserMinus,
  Mail,
  Trophy,
  Users,
  Heart,
  Share2,
  Calendar,
  MessageCircle,
} from "lucide-react";

interface UserProfile {
  id: string;
  name: string;
  image: string;
  createdAt: string;
  xp: number;
  level: number;
  xpTitle: string;
  xpProgress: number;
  xpToNextLevel: number;
  activeFlair: string;
  activeFrame: string;
  activeTheme: string;
  achievements: Array<{
    id: string;
    achievement: {
      id: string;
      name: string;
      title: string;
      description: string;
      icon: string;
      category: string;
      rarity: string;
    };
  }>;
  teams: Array<{
    id: string;
    team: {
      id: string;
      name: string;
      description: string;
    };
  }>;
  stats: {
    puzzlesSolved: number;
    totalPoints: number;
    achievementsCount: number;
    teamsCount: number;
  };
  social: {
    followers: number;
    following: number;
    isFollowing: boolean;
  };
}

export default function PublicProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const userId = params.id as string;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserNameChanged, setCurrentUserNameChanged] = useState<boolean>(false);
  const [showNameChangeConfirm, setShowNameChangeConfirm] = useState<boolean>(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [userTeams, setUserTeams] = useState<Array<{ id: string; name: string; memberCount: number }>>([]);
  const [selectedTeam, setSelectedTeam] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState("");
  const [nameError, setNameError] = useState("");
  const [nameSaving, setNameSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const [showMyPuzzles, setShowMyPuzzles] = useState(false);
  const [myPuzzles, setMyPuzzles] = useState<Array<any>>([]);
  const [myPuzzlesLoading, setMyPuzzlesLoading] = useState(false);

  useEffect(() => {
    if (userId) {
      fetchProfile();
    }
  }, [userId]);

  useEffect(() => {
    // Fetch current authenticated user's id for accurate ownership checks
    const fetchCurrentUser = async () => {
      try {
        const res = await fetch('/api/user/info');
        if (res.ok) {
          const data = await res.json();
          if (data?.id) setCurrentUserId(data.id);
          setCurrentUserNameChanged(!!data?.nameChanged);
        }
      } catch (err) {
        // ignore silently; ownership will fall back to session if available
        console.debug('Could not fetch current user id', err);
      }
    };

    fetchCurrentUser();
  }, []);

  const fetchProfile = async () => {
    if (!userId) {
      setError("User ID is missing");
      setLoading(false);
      console.error("userId is empty or undefined");
      return;
    }

    try {
      const response = await fetch(`/api/users/${userId}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to fetch profile`);
      }
      const data = await response.json();
      setProfile(data);
      setIsFollowing(data.social.isFollowing);
      setError("");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load profile";
      setError(errorMessage);
      console.error("Profile fetch error:", { userId, error: err });
    } finally {
      setLoading(false);
    }
  };

  const handleFollowToggle = async () => {
    if (!session) {
      router.push("/auth/signin");
      return;
    }

    try {
      const response = await fetch(`/api/users/${userId}/follow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: isFollowing ? "unfollow" : "follow",
        }),
      });

      if (response.ok) {
        setIsFollowing(!isFollowing);
        await fetchProfile();
      }
    } catch (err) {
      console.error("Failed to toggle follow:", err);
    }
  };

  const fetchUserTeams = async () => {
    try {
      const response = await fetch("/api/teams/user-teams");
      if (response.ok) {
        const data = await response.json();
        setUserTeams(data.teams || []);
      }
    } catch (err) {
      console.error("Failed to fetch user teams:", err);
      setInviteError("Failed to load your teams");
    }
  };

  const handleSendTeamInvite = async () => {
    if (!selectedTeam) {
      setInviteError("Please select a team");
      return;
    }

    setInviteLoading(true);
    setInviteError("");

    try {
      const response = await fetch("/api/teams/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId: selectedTeam,
          userId: userId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to send invite");
      }

      setShowInviteModal(false);
      setSelectedTeam("");
      setInviteError(""); // Show success message in snackbar instead
      alert("Team invitation sent successfully!");
    } catch (err) {
      setInviteError(
        err instanceof Error ? err.message : "Failed to send invite"
      );
    } finally {
      setInviteLoading(false);
    }
  };

  const handleUpdateName = async () => {
    const candidate = newName.trim();
    if (!candidate) {
      setNameError("Name cannot be empty");
      return;
    }
    // Client-side validation: use same rules including banned words
    try {
      const { isAllowedDisplayName } = await import('@/lib/display-name-validator');
      const v = isAllowedDisplayName(candidate);
      if (!v.ok) {
        setNameError(v.reason || 'Invalid name');
        return;
      }
    } catch (e) {
      // fallback to simple regexp if import fails
      const validRe = /^[A-Za-z0-9]{3,16}$/;
      if (!validRe.test(candidate)) {
        setNameError('Name must be 3-16 characters and contain only letters and numbers');
        return;
      }
    }

    setNameSaving(true);
    setNameError("");

    try {
      const response = await fetch("/api/user/update-name", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update name");
      }

      // Update local profile
      if (profile) {
        setProfile({ ...profile, name: newName.trim() });
      }
      // mark name as changed so edit UI is no longer available
      setCurrentUserNameChanged(true);
      setIsEditingName(false);
      setNewName("");
    } catch (err) {
      setNameError(err instanceof Error ? err.message : "Failed to update name");
    } finally {
      setNameSaving(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setAvatarError("Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed");
      setTimeout(() => setAvatarError(""), 5000);
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setAvatarError("File too large. Maximum size is 5MB");
      setTimeout(() => setAvatarError(""), 5000);
      return;
    }

    setAvatarUploading(true);
    setAvatarError("");

    try {
      const formData = new FormData();
      formData.append("avatar", file);

      const response = await fetch("/api/user/upload-avatar", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        // Update local profile state
        if (profile) {
          setProfile({ ...profile, image: data.imageUrl });
        }
      } else {
        setAvatarError(data.error || "Failed to upload avatar");
        setTimeout(() => setAvatarError(""), 5000);
      }
    } catch (err) {
      setAvatarError("An error occurred while uploading your avatar");
      setTimeout(() => setAvatarError(""), 5000);
      console.error("Avatar upload error:", err);
    } finally {
      setAvatarUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#020202' }}>
        <div style={{ color: '#FDE74C' }} className="text-lg">Loading profile...</div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#020202' }}>
        <div style={{ color: '#AB9F9D' }} className="text-lg">{error || "Profile not found"}</div>
      </div>
    );
  }

  const isOwnProfile = (currentUserId || (session?.user as any)?.id) === userId;

  // Theme colors
  const themeMap: Record<string, {
    bg: string; accent: string; secondary: string;
    headerBg: string; headerGrad: string;
    cardBg: string; cardBorder: string;
    accentMuted: string; accentGlow: string;
    btnBg: string; btnText: string;
    topBar: string;
  }> = {
    gold: {
      bg: '#0d0900',
      accent: '#FDE74C', secondary: '#FFB86B',
      headerBg: 'rgba(253,231,76,0.10)', headerGrad: 'linear-gradient(135deg, #2a1a00 0%, #1a1000 50%, #0d0900 100%)',
      cardBg: 'rgba(253,231,76,0.07)', cardBorder: '#FDE74C',
      accentMuted: 'rgba(253,231,76,0.15)', accentGlow: 'rgba(253,231,76,0.8)',
      btnBg: 'linear-gradient(135deg, #FDE74C, #FFB86B)', btnText: '#1a1000',
      topBar: 'linear-gradient(90deg, #FDE74C, #FFB86B)',
    },
    neon: {
      bg: '#04000e',
      accent: '#00FFFF', secondary: '#CC00FF',
      headerBg: 'rgba(0,255,255,0.08)', headerGrad: 'linear-gradient(135deg, #0a0020 0%, #04000e 50%, #000a12 100%)',
      cardBg: 'rgba(0,255,255,0.06)', cardBorder: '#00FFFF',
      accentMuted: 'rgba(0,255,255,0.12)', accentGlow: 'rgba(0,255,255,0.9)',
      btnBg: 'linear-gradient(135deg, #00FFFF, #CC00FF)', btnText: '#000',
      topBar: 'linear-gradient(90deg, #00FFFF, #CC00FF)',
    },
    crimson: {
      bg: '#0e0000',
      accent: '#ef4444', secondary: '#F97316',
      headerBg: 'rgba(220,38,38,0.10)', headerGrad: 'linear-gradient(135deg, #2d0000 0%, #1a0000 50%, #0e0000 100%)',
      cardBg: 'rgba(220,38,38,0.08)', cardBorder: '#ef4444',
      accentMuted: 'rgba(220,38,38,0.15)', accentGlow: 'rgba(220,38,38,0.85)',
      btnBg: 'linear-gradient(135deg, #DC2626, #F97316)', btnText: '#fff',
      topBar: 'linear-gradient(90deg, #DC2626, #F97316)',
    },
    default: {
      bg: '#020202',
      accent: '#3891A6', secondary: '#FDE74C',
      headerBg: 'rgba(56,145,166,0.12)', headerGrad: 'linear-gradient(135deg, rgba(56,145,166,0.2) 0%, #020202 100%)',
      cardBg: 'rgba(56,145,166,0.10)', cardBorder: '#3891A6',
      accentMuted: 'rgba(56,145,166,0.15)', accentGlow: 'rgba(56,145,166,0)',
      btnBg: '#3891A6', btnText: '#fff',
      topBar: 'linear-gradient(90deg, #3891A6, #38D399)',
    },
  };
  const theme = themeMap[profile.activeTheme || 'default'] ?? themeMap.default;

  // Avatar frame styles
  // Frame config: colors for the animated conic-gradient ring
  const frameAnimConfig: Record<string, { colorA: string; colorB: string; glow: string } | null> = {
    gold:  { colorA: '#FDE74C', colorB: '#FFB86B', glow: '0 0 20px rgba(253,231,76,0.7), 0 0 40px rgba(253,231,76,0.3)' },
    neon:  { colorA: '#00FFFF', colorB: '#CC00FF', glow: '0 0 20px rgba(0,255,255,0.7), 0 0 40px rgba(204,0,255,0.4)' },
    flame: { colorA: '#FF4500', colorB: '#FDE74C', glow: '0 0 20px rgba(255,69,0,0.8), 0 0 40px rgba(253,231,76,0.4)' },
    none:  null,
  };
  const activeFrame = frameAnimConfig[profile.activeFrame || 'none'] ?? null;

  // Render avatar (shared helper for header and card)
  const renderAvatar = (sizeClass: string) => {
    if (activeFrame) {
      return (
        <div
          className={`${sizeClass} avatar-frame-animated flex-shrink-0`}
          style={{
            '--frame-color-a': activeFrame.colorA,
            '--frame-color-b': activeFrame.colorB,
            '--frame-inner-bg': theme.bg,
            boxShadow: activeFrame.glow,
          } as React.CSSProperties}
        >
          <div className="avatar-frame-inner">
            {profile.image
              ? <img src={profile.image} alt={profile.name} className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center text-3xl" style={{ background: theme.accentMuted }}>👤</div>}
          </div>
        </div>
      );
    }
    return (
      <div
        className={`${sizeClass} rounded-full overflow-hidden border-4 flex-shrink-0 flex items-center justify-center`}
        style={{ borderColor: theme.accent, boxShadow: `0 0 14px ${theme.accentGlow}` }}
      >
        {profile.image
          ? <img src={profile.image} alt={profile.name} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center text-4xl" style={{ backgroundColor: theme.accentMuted }}>👤</div>}
      </div>
    );
  };

  return (
    <div style={{ backgroundColor: theme.bg, backgroundImage: theme.headerGrad }} className="min-h-screen">
      {/* Theme accent bar */}
      <div className="fixed top-0 left-0 right-0 h-[3px] z-50" style={{ background: theme.topBar, boxShadow: `0 0 12px ${theme.accentGlow}` }} />
      {/* Profile Section */}
      <div className="max-w-4xl mx-auto px-4 py-12 pt-28">
        {/* Profile Header */}
          <div className="border rounded-lg p-8 mb-8" style={{ backgroundColor: theme.headerBg, borderColor: theme.accent, boxShadow: `0 0 30px ${theme.accentMuted}` }}>
          <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between mb-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 w-full">
              <div className="relative flex-shrink-0 mb-4 sm:mb-0">
                {renderAvatar('w-24 h-24')}
                {isOwnProfile && (
                  <>
                    <label
                      htmlFor="avatar-upload"
                      className="absolute bottom-0 right-0 w-8 h-8 rounded-full flex items-center justify-center cursor-pointer border-2 border-white transition-opacity hover:opacity-80"
                      style={{ background: theme.btnBg, color: theme.btnText } as React.CSSProperties}
                      title="Upload avatar"
                    >
                      {avatarUploading ? (
                        <span className="text-white text-xs">...</span>
                      ) : (
                        <span className="text-white text-lg">📷</span>
                      )}
                    </label>
                    <input
                      id="avatar-upload"
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                      className="hidden"
                      onChange={handleAvatarUpload}
                      disabled={avatarUploading}
                    />
                  </>
                )}
              </div>
              {avatarError && (
                <div className="px-3 py-2 rounded text-sm max-w-xs" style={{ backgroundColor: '#EF4444', color: 'white' }}>
                  {avatarError}
                </div>
              )}
              <div>
                {isOwnProfile && !isEditingName && !currentUserNameChanged ? (
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-4xl font-bold text-white">
                      {profile.name || "Anonymous Player"}{profile.activeFlair && profile.activeFlair !== "none" ? ` ${profile.activeFlair}` : ""}
                    </h1>
                    <button
                      onClick={() => {
                        // Show one-time-change confirmation before allowing edit
                        setShowNameChangeConfirm(true);
                      }}
                      className="px-3 py-1 rounded text-sm font-medium transition-colors"
                      style={{ background: theme.btnBg, color: theme.btnText } as React.CSSProperties}
                    >
                      Edit
                    </button>
                  </div>
                ) : isOwnProfile && isEditingName ? (
                  <div className="mb-2">
                    <div className="flex flex-col sm:flex-row items-center gap-2 mb-2">
                      <input
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        maxLength={50}
                        className="w-full sm:flex-1 sm:min-w-0 px-3 py-2 rounded border text-white text-2xl sm:text-4xl font-bold"
                        style={{
                          backgroundColor: 'rgba(0,0,0,0.5)',
                          borderColor: theme.accent,
                        }}
                        placeholder="Enter your name"
                      />

                      <div className="flex w-full sm:w-auto gap-2">
                        <button
                          onClick={handleUpdateName}
                          disabled={nameSaving}
                          className="flex-1 sm:flex-none w-full sm:w-auto px-4 py-2 rounded text-sm font-medium transition-colors disabled:opacity-50"
                          style={{ background: theme.btnBg, color: theme.btnText } as React.CSSProperties}
                        >
                          {nameSaving ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          onClick={() => {
                            setIsEditingName(false);
                            setNewName("");
                            setNameError("");
                          }}
                          disabled={nameSaving}
                          className="flex-1 sm:flex-none w-full sm:w-auto px-4 py-2 rounded text-sm font-medium transition-colors disabled:opacity-50"
                          style={{ backgroundColor: '#AB9F9D', color: 'white' }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                    {nameError && (
                      <p className="text-sm" style={{ color: '#EF4444' }}>{nameError}</p>
                    )}
                  </div>
                ) : (
                  <h1 className="text-4xl font-bold text-white mb-2">
                    {profile.name || "Anonymous Player"}{profile.activeFlair && profile.activeFlair !== "none" ? ` ${profile.activeFlair}` : ""}
                  </h1>
                )}
                <div className="flex items-center gap-4" style={{ color: '#DDDBF1' }}>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    Joined {new Date(profile.createdAt).toLocaleDateString()}
                  </div>
                </div>
                {/* XP / Level bar */}
                <div className="mt-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(129,140,248,0.2)', border: '1px solid rgba(129,140,248,0.4)', color: '#a5b4fc' }}>
                      Lv.{profile.level}
                    </span>
                    <span className="text-sm font-semibold" style={{ color: '#818cf8' }}>{profile.xpTitle}</span>
                    <span className="text-xs ml-auto" style={{ color: '#475569' }}>{profile.xpToNextLevel} XP to next level</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden w-full max-w-xs" style={{ background: 'rgba(129,140,248,0.12)' }}>
                    <div className="h-full rounded-full" style={{ width: `${profile.xpProgress}%`, background: 'linear-gradient(90deg, #818cf8, #c084fc)' }} />
                  </div>
                </div>
              </div>
            </div>

            {!isOwnProfile && (
              <div className="profile-action-buttons flex flex-row gap-2 mt-2 items-center whitespace-nowrap">
                <button
                  onClick={handleFollowToggle}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors shadow-sm"
                  style={{
                    backgroundColor: isFollowing ? '#EF4444' : '#38A169', // red for unfollow, green for follow
                    color: 'white',
                    minWidth: 90,
                  }}
                >
                  {isFollowing ? (
                    <>
                      <UserMinus className="w-4 h-4" />
                      Unfollow
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      Follow
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowInviteModal(true);
                    fetchUserTeams();
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors shadow-sm"
                  style={{ backgroundColor: '#2563EB', color: 'white', minWidth: 110 }}
                  title="Invite to your team"
                >
                  <Users className="w-4 h-4" />
                  Invite to Team
                </button>
                {!isOwnProfile && session && (
                  <button
                    onClick={() => setShowMessageModal(true)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors shadow-sm"
                    style={{ backgroundColor: '#FDE74C', color: '#222', minWidth: 90 }}
                  >
                    <MessageCircle className="w-4 h-4" />
                    Message
                  </button>
                )}
              </div>
            )}
          </div>

          

          {/* Stats Grid */}
          <div className="grid justify-items-center grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-lg p-4 flex flex-col items-center text-center gap-2 w-full" style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}>
              <div className="flex-shrink-0">
                <Trophy className="w-8 h-8 text-white/80 mx-auto" />
              </div>
              <div>
                <p style={{ color: '#DDDBF1' }} className="text-sm mb-1">Puzzles Solved</p>
                <p className="text-4xl font-extrabold text-white">{profile.stats.puzzlesSolved}</p>
              </div>
            </div>
            <div className="rounded-lg p-4 flex flex-col items-center text-center gap-2 w-full" style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}>
              <div className="flex-shrink-0">
                <Share2 className="w-8 h-8 text-yellow-400/80 mx-auto" />
              </div>
              <div>
                <p style={{ color: '#DDDBF1' }} className="text-sm mb-1">Total Points</p>
                <p className="text-4xl font-extrabold" style={{ color: '#FDE74C' }}>
                  {profile.stats.totalPoints}
                </p>
              </div>
            </div>
            <div className="rounded-lg p-4 flex flex-col items-center text-center gap-2 w-full" style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}>
              <div className="flex-shrink-0">
                <Trophy className="w-8 h-8 text-emerald-400/80 mx-auto" />
              </div>
              <div>
                <p style={{ color: '#DDDBF1' }} className="text-sm mb-1">Achievements</p>
                <p className="text-4xl font-extrabold text-white">{profile.stats.achievementsCount}</p>
              </div>
            </div>
            <div className="rounded-lg p-4 flex flex-col items-center text-center gap-2 w-full" style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}>
              <div className="flex-shrink-0">
                <Users className="w-8 h-8 text-sky-400/80 mx-auto" />
              </div>
              <div>
                <p style={{ color: '#DDDBF1' }} className="text-sm mb-1">Teams</p>
                <p className="text-4xl font-extrabold text-white">{profile.stats.teamsCount}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Social Stats */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="border rounded-lg p-4" style={{ backgroundColor: theme.cardBg, borderColor: theme.accent }}>
            <div className="flex items-center justify-between">
              <div>
                <p style={{ color: '#DDDBF1' }} className="text-sm mb-1">Followers</p>
                <p className="text-2xl font-bold text-white">{profile.social.followers}</p>
              </div>
              <Heart className="w-8 h-8" style={{ color: '#EF4444' }} />
            </div>
          </div>
          <div className="border rounded-lg p-4" style={{ backgroundColor: theme.cardBg, borderColor: theme.accent }}>
            <div className="flex items-center justify-between">
              <div>
                <p style={{ color: '#DDDBF1' }} className="text-sm mb-1">Following</p>
                <p className="text-2xl font-bold text-white">{profile.social.following}</p>
              </div>
              <Users className="w-8 h-8" style={{ color: theme.accent }} />
            </div>
          </div>
        </div>

        {/* My Puzzles Archive (own profile only) - moved below Social Stats */}
        {isOwnProfile && (
          <div className="mb-8">
            <div className="border rounded-lg p-6" style={{ backgroundColor: theme.cardBg, borderColor: theme.accent }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">My Puzzles (Archive)</h3>
                <button
                  onClick={async () => {
                    setShowMyPuzzles(!showMyPuzzles);
                    if (!showMyPuzzles && myPuzzles.length === 0) {
                      setMyPuzzlesLoading(true);
                      try {
                        const res = await fetch('/api/user/puzzles');
                        if (res.ok) {
                          const data = await res.json();
                          setMyPuzzles(data);
                        }
                      } catch (e) {
                        console.error('Failed to fetch my puzzles:', e);
                      } finally {
                        setMyPuzzlesLoading(false);
                      }
                    }
                  }}
                  className="px-4 py-2 rounded text-sm font-semibold transition hover:opacity-90"
                  style={{ background: theme.btnBg, color: theme.btnText } as React.CSSProperties}
                >
                  {showMyPuzzles ? 'Hide' : 'Open'}
                </button>
              </div>

              {showMyPuzzles && (
                <div>
                  {myPuzzlesLoading ? (
                    <p className="text-sm" style={{ color: '#AB9F9D' }}>Loading...</p>
                  ) : myPuzzles.length === 0 ? (
                    <p className="text-sm" style={{ color: '#AB9F9D' }}>No archived puzzles yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {myPuzzles.map((p) => (
                        <div key={p.id} className="block border rounded p-3" style={{ borderColor: theme.accent, backgroundColor: theme.accentMuted }} role="group" aria-disabled="true">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-semibold text-white">{p.title}</h4>
                              <p className="text-xs" style={{ color: '#AB9F9D' }}>{p.category?.name || 'General'} · {p.difficulty}</p>
                            </div>
                            <div className="text-right">
                              <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: p.solved ? 'rgba(56, 201, 153, 0.12)' : 'rgba(239, 68, 68, 0.08)', color: p.solved ? '#38D399' : '#EF4444' }}>
                                {p.solved ? '✓ Solved' : '✗ Failed'}
                              </span>
                              <div className="text-xs mt-1" style={{ color: '#AB9F9D' }}>{p.attempts ?? 0} attempts</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Teams Section */}
        {profile.teams.length > 0 && (
          <div className="border rounded-lg p-6 mb-8" style={{ backgroundColor: theme.cardBg, borderColor: theme.accent }}>
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <Users className="w-6 h-6" style={{ color: theme.accent }} />
              Teams ({profile.teams.length})
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {profile.teams.map((tm) => (
                <Link
                  key={tm.team.id}
                  href={`/teams/${tm.team.id}`}
                  className="p-4 rounded-lg border transition-all hover:shadow-lg cursor-pointer"
                  style={{
                    backgroundColor: theme.accentMuted,
                    borderColor: theme.accent,
                  }}
                >
                  <h3 className="font-semibold text-white mb-1">{tm.team.name}</h3>
                  {tm.team.description && (
                    <p style={{ color: '#DDDBF1' }} className="text-sm line-clamp-2">
                      {tm.team.description}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Achievements Section */}
        {profile.achievements.length > 0 && (
          <div className="border rounded-lg p-6" style={{ backgroundColor: theme.cardBg, borderColor: theme.accent }}>
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <Trophy className="w-6 h-6" style={{ color: theme.accent }} />
              Achievements ({profile.achievements.length})
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {profile.achievements.map((ach) => {
                const rarityKey = (ach.achievement.rarity || 'common') as Rarity;
                const color = rarityColors[rarityKey] || rarityColors.common;
                return (
                  <div
                    key={ach.id}
                    className="p-4 rounded-lg border text-center transition-all hover:shadow-lg"
                    style={{
                      backgroundColor: color.bg,
                      borderColor: color.border,
                    }}
                    title={ach.achievement.description}
                  >
                    <div className="text-4xl mb-2">{ach.achievement.icon}</div>
                    <h3 className="font-semibold text-sm mb-1" style={{ color: color.text }}>
                      {ach.achievement.title}
                    </h3>
                    <p style={{ color: '#DDDBF1' }} className="text-xs mb-2">
                      {ach.achievement.category}
                    </p>
                    <span
                      className="inline-block px-2 py-1 rounded text-xs font-bold capitalize"
                      style={{
                        backgroundColor: color.bg,
                        color: color.text,
                        border: `1px solid ${color.border}`,
                      }}
                    >
                      {ach.achievement.rarity}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {profile.achievements.length === 0 && profile.teams.length === 0 && (
          <div className="text-center py-12">
            <p style={{ color: '#DDDBF1' }} className="text-lg">
              This player hasn't earned any achievements or joined teams yet.
            </p>
          </div>
        )}
      </div>

      {/* Message Modal */}
      {showMessageModal && !isOwnProfile && (
        <DirectMessageModal
          targetUserId={userId}
          targetUserName={profile.name}
          onClose={() => setShowMessageModal(false)}
          accentColor={theme.accent}
          accentMuted={theme.accentMuted}
          btnBg={theme.btnBg}
          btnText={theme.btnText}
        />
      )}

      {/* Team Invite Modal */}
      {showInviteModal && !isOwnProfile && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowInviteModal(false)}
          />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div
              className="w-full max-w-md rounded-lg shadow-xl border p-6"
              style={{
                backgroundColor: "rgba(2, 2, 2, 0.97)",
                borderColor: theme.accent,
              }}
            >
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Users className="w-5 h-5" />
                Invite to Team
              </h2>

              {inviteError && (
                <div
                  className="p-3 rounded-lg text-sm mb-4"
                  style={{
                    backgroundColor: "rgba(239, 68, 68, 0.1)",
                    borderColor: "#EF4444",
                    borderWidth: "1px",
                    color: "#FCA5A5",
                  }}
                >
                  {inviteError}
                </div>
              )}

              {userTeams.length === 0 ? (
                <div
                  className="p-4 rounded-lg text-center"
                  style={{
                    backgroundColor: theme.cardBg,
                    borderColor: theme.accent,
                    borderWidth: "1px",
                    color: "#DDDBF1",
                  }}
                >
                  <p>You haven't created or joined any teams yet.</p>
                  <Link
                    href="/teams"
                    className="mt-4 inline-block px-4 py-2 rounded-lg font-medium transition-colors"
                    style={{ background: theme.btnBg, color: theme.btnText } as React.CSSProperties}
                  >
                    Create a Team
                  </Link>
                </div>
              ) : (
                <>
                  <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
                    {userTeams.map((team) => (
                      <label
                        key={team.id}
                        className="flex items-center p-3 rounded-lg cursor-pointer transition-colors"
                        style={{
                          backgroundColor:
                            selectedTeam === team.id
                              ? theme.accentMuted
                              : "rgba(51, 65, 85, 0.5)",
                          borderColor: selectedTeam === team.id ? theme.accent : "#475569",
                          borderWidth: "1px",
                        }}
                      >
                        <input
                          type="radio"
                          name="team"
                          value={team.id}
                          checked={selectedTeam === team.id}
                          onChange={(e) => setSelectedTeam(e.target.value)}
                          className="mr-3"
                        />
                        <div className="flex-1">
                          <p className="text-white font-semibold">{team.name}</p>
                          <p style={{ color: "#DDDBF1" }} className="text-sm">
                            {team.memberCount}/4 members
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setShowInviteModal(false)}
                      className="flex-1 px-4 py-2 rounded-lg text-white transition-colors"
                      style={{ backgroundColor: theme.accentMuted }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      onClick={handleSendTeamInvite}
                      disabled={inviteLoading || !selectedTeam}
                      className="flex-1 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                      style={{ background: theme.btnBg, color: theme.btnText } as React.CSSProperties}
                    >
                      {inviteLoading ? "Sending..." : "Send Invite"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* One-time name-change confirmation modal */}
      <ConfirmModal
        isOpen={showNameChangeConfirm}
        title="Change display name"
        message="You may only change your display name once. Are you sure you want to continue?"
        confirmLabel="Continue"
        cancelLabel="Cancel"
        onConfirm={() => {
          setShowNameChangeConfirm(false);
          setIsEditingName(true);
          setNewName(profile?.name || "");
          setNameError("");
        }}
        onCancel={() => setShowNameChangeConfirm(false)}
      />
    </div>
  );
}

function DirectMessageModal({
  targetUserId,
  targetUserName,
  onClose,
  accentColor = '#3891A6',
  accentMuted = 'rgba(56,145,166,0.15)',
  btnBg = '#3891A6',
  btnText = '#fff',
}: {
  targetUserId: string;
  targetUserName: string;
  onClose: () => void;
  accentColor?: string;
  accentMuted?: string;
  btnBg?: string;
  btnText?: string;
}) {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!message.trim()) {
      setError("Message cannot be empty");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/users/${targetUserId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: message }),
      });

      if (response.ok) {
        setSuccess(true);
        setMessage("");
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setError("Failed to send message");
      }
    } catch (err) {
      setError("An error occurred while sending message");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div
          className="w-full max-w-md rounded-lg shadow-xl border p-6"
          style={{
            backgroundColor: "rgba(2, 2, 2, 0.97)",
            borderColor: accentColor,
          }}
        >
          <h2 className="text-xl font-bold text-white mb-4">
            Message {targetUserName}
          </h2>

          <form onSubmit={handleSendMessage} className="space-y-4">
            {error && (
              <div
                className="p-3 rounded-lg text-sm"
                style={{
                  backgroundColor: "rgba(239, 68, 68, 0.1)",
                  borderColor: "#EF4444",
                  borderWidth: "1px",
                  color: "#FCA5A5",
                }}
              >
                {error}
              </div>
            )}

            {success && (
              <div
                className="p-3 rounded-lg text-sm"
                style={{
                  backgroundColor: "rgba(34, 197, 94, 0.1)",
                  borderColor: "#22C55E",
                  borderWidth: "1px",
                  color: "#86EFAC",
                }}
              >
                Message sent!
              </div>
            )}

            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message here..."
              maxLength={5000}
              rows={4}
              className="w-full px-4 py-2 rounded-lg text-white placeholder-gray-500 resize-none"
              style={{
                backgroundColor: accentMuted,
                borderColor: accentColor,
                borderWidth: "1px",
              }}
            />

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 rounded-lg text-white transition-colors"
                style={{ backgroundColor: accentMuted }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                style={{ background: btnBg, color: btnText } as React.CSSProperties}
              >
                {loading ? "Sending..." : "Send Message"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
