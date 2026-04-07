"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import AchievementNotification from "@/components/AchievementNotification";
import { Rarity, rarityColors } from "@/lib/rarity";

interface Achievement {
  id: string;
  name: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  rarity: string;
  requirement: string;
  conditionType: string;
  conditionValue?: number;
  unlocked: boolean;
  unlockedAt?: Date;
  currentProgress?: number;
  progressPercentage?: number;
}

interface AchievementsData {
  achievements: Achievement[];
  totalUnlocked: number;
  totalAvailable: number;
  rarityCount: {
    common: number;
    uncommon: number;
    rare: number;
    epic: number;
    legendary: number;
  };
  rarityUnlockedCount: {
    common: number;
    uncommon: number;
    rare: number;
    epic: number;
    legendary: number;
  };
}

const CATEGORY_META: Record<string, { label: string; icon: string }> = {
  milestone:     { label: "Milestone",     icon: "🏆" },
  speed:         { label: "Speed",         icon: "⚡" },
  mastery:       { label: "Mastery",       icon: "🎓" },
  exploration:   { label: "Exploration",   icon: "🗺️" },
  collaboration: { label: "Collaboration", icon: "🤝" },
  special:       { label: "Special",       icon: "✨" },
};

const AUTO_UNLOCK_TYPES = ["puzzles_solved", "submission_accuracy", "points_earned", "streak", "custom"];

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.045, duration: 0.35, ease: "easeOut" },
  }),
};

export default function AchievementsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<AchievementsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [collecting, setCollecting] = useState<string | null>(null);
  const [achievementQueue, setAchievementQueue] = useState<any[]>([]);
  const [shownAchievements, setShownAchievements] = useState<Set<string>>(new Set());

  const notificationAchievement = achievementQueue[0] ?? null;

  const shownStorageKey = session?.user?.email ? `achievements-page-shown:${session.user.email}` : null;

  const persistShown = (next?: Set<string>) => {
    try {
      if (!shownStorageKey) return;
      const ids = Array.from((next || shownAchievements).values());
      localStorage.setItem(shownStorageKey, JSON.stringify(ids));
    } catch { /* ignore */ }
  };

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/signin");
  }, [status, router]);

  useEffect(() => {
    if (!session?.user?.email) return;
    try {
      if (shownStorageKey) {
        const raw = localStorage.getItem(shownStorageKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) setShownAchievements(new Set(parsed.filter((x) => typeof x === "string")));
        }
      }
    } catch { /* ignore */ }

    fetchAchievements();
    const interval = setInterval(fetchAchievements, 5000);
    return () => clearInterval(interval);
  }, [session?.user?.email]);

  const fetchAchievements = async () => {
    try {
      const response = await fetch("/api/user/achievements");
      if (response.ok) {
        const result = await response.json();
        setData(result);
        result.achievements.forEach((achievement: Achievement) => {
          const canAutoCollect = AUTO_UNLOCK_TYPES.includes(achievement.conditionType || "");
          const isReady = !achievement.unlocked && achievement.progressPercentage === 100 && canAutoCollect;
          if (isReady && !shownAchievements.has(achievement.id)) {
            setAchievementQueue((prev) => [...prev, achievement]);
            setShownAchievements((prev) => {
              const next = new Set(prev).add(achievement.id);
              persistShown(next);
              return next;
            });
            fetch("/api/user/achievements/notify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                achievementId: achievement.id,
                achievementTitle: achievement.title,
                achievementDescription: achievement.description,
                achievementIcon: achievement.icon,
              }),
            }).catch(() => {});
          }
        });
      }
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  };

  const collectAchievement = async (achievementId: string) => {
    setAchievementQueue((prev) => prev.slice(1));
    setShownAchievements((prev) => {
      const next = new Set(prev).add(achievementId);
      persistShown(next);
      return next;
    });
    setCollecting(achievementId);
    try {
      const response = await fetch("/api/user/achievements/collect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ achievementId }),
      });
      if (response.ok) await fetchAchievements();
    } catch { /* ignore */ } finally {
      setCollecting(null);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#020202" }}>
        <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity }}>
          <p className="text-lg font-semibold" style={{ color: "#3891A6" }}>Loading achievements…</p>
        </motion.div>
      </div>
    );
  }

  if (!session?.user || !data) return null;

  const categories = Object.keys(CATEGORY_META);
  const filteredAchievements = selectedCategory
    ? data.achievements.filter((a) => a.category === selectedCategory)
    : data.achievements;

  const overallPct = data.totalAvailable > 0 ? (data.totalUnlocked / data.totalAvailable) * 100 : 0;
  const readyToCollect = data.achievements.filter(
    (a) => !a.unlocked && a.progressPercentage === 100 && AUTO_UNLOCK_TYPES.includes(a.conditionType || "")
  ).length;

  return (
    <main className="min-h-screen" style={{ backgroundColor: "#020202" }}>
      {notificationAchievement && (
        <AchievementNotification
          key={notificationAchievement.id}
          achievement={notificationAchievement}
          rarityColors={rarityColors}
          isCollecting={collecting === notificationAchievement.id}
          onClose={() => setAchievementQueue((prev) => prev.slice(1))}
          onCollect={() => collectAchievement(notificationAchievement.id)}
        />
      )}

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <div
        className="pt-28 pb-16 px-4 relative overflow-hidden"
        style={{
          background: "linear-gradient(160deg, rgba(56,145,166,0.12) 0%, rgba(253,231,76,0.04) 50%, #020202 100%)",
          borderBottom: "1px solid rgba(56,145,166,0.15)",
        }}
      >
        {/* background grid dots */}
        <div
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage: "radial-gradient(rgba(56,145,166,0.35) 1px, transparent 1px)",
            backgroundSize: "36px 36px",
          }}
        />
        <div className="max-w-7xl mx-auto relative">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <p className="text-xs font-black tracking-[0.3em] uppercase mb-3" style={{ color: "#3891A6" }}>
              ✦ Your Collection
            </p>
            <h1
              className="text-5xl sm:text-6xl font-black mb-4 leading-tight"
              style={{ background: "linear-gradient(90deg, #fff 0%, #3891A6 60%, #FDE74C 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
            >
              Achievements
            </h1>
            <p className="text-base max-w-lg" style={{ color: "#9ca3af" }}>
              Unlock badges, hit milestones, and cement your place among the puzzle elite.
            </p>
          </motion.div>

          {/* Stat pills */}
          <motion.div
            className="flex flex-wrap gap-3 mt-8"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.45 }}
          >
            {[
              { label: "Unlocked",       value: data.totalUnlocked,  color: "#3891A6" },
              { label: "Total",          value: data.totalAvailable, color: "#6b7280" },
              { label: "Ready to Claim", value: readyToCollect,      color: "#FDE74C" },
            ].map((s) => (
              <div
                key={s.label}
                className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold"
                style={{ backgroundColor: "rgba(255,255,255,0.04)", border: `1px solid ${s.color}30` }}
              >
                <span className="text-lg font-black" style={{ color: s.color }}>{s.value}</span>
                <span style={{ color: "#6b7280" }}>{s.label}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* ── Progress + Rarity grid ──────────────────────────────── */}
        <div className="grid md:grid-cols-2 gap-6 mb-14">
          {/* Overall progress card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl p-7"
            style={{
              background: "linear-gradient(135deg, rgba(56,145,166,0.1) 0%, rgba(56,145,166,0.04) 100%)",
              border: "1px solid rgba(56,145,166,0.2)",
            }}
          >
            <h3 className="text-xs font-black tracking-widest uppercase mb-5" style={{ color: "#3891A6" }}>Overall Progress</h3>
            <div className="flex items-end justify-between mb-3">
              <span className="text-5xl font-black text-white">{Math.round(overallPct)}<span className="text-2xl text-gray-500">%</span></span>
              <span className="text-sm" style={{ color: "#6b7280" }}>{data.totalUnlocked} of {data.totalAvailable}</span>
            </div>
            <div className="w-full rounded-full overflow-hidden" style={{ height: "8px", backgroundColor: "rgba(255,255,255,0.06)" }}>
              <motion.div
                className="h-full rounded-full"
                style={{ background: "linear-gradient(90deg, #3891A6, #FDE74C)" }}
                initial={{ width: 0 }}
                animate={{ width: `${overallPct}%` }}
                transition={{ duration: 1.1, delay: 0.3, ease: "easeOut" }}
              />
            </div>
          </motion.div>

          {/* Rarity breakdown */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 }}
            className="rounded-2xl p-7"
            style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.07)",
            }}
          >
            <h3 className="text-xs font-black tracking-widest uppercase mb-5" style={{ color: "#6b7280" }}>Rarity Breakdown</h3>
            <div className="space-y-2">
              {(Object.entries(data.rarityCount) as [Rarity, number][]).map(([rarity, total]) => {
                const c = rarityColors[rarity] ?? rarityColors["common"];
                const unlocked = data.rarityUnlockedCount?.[rarity] || 0;
                const pct = total > 0 ? (unlocked / total) * 100 : 0;
                return (
                  <div key={rarity} className="flex items-center gap-3">
                    <span className="w-20 text-xs font-bold capitalize shrink-0" style={{ color: c.text }}>{rarity}</span>
                    <div className="flex-1 rounded-full overflow-hidden" style={{ height: "6px", backgroundColor: "rgba(255,255,255,0.06)" }}>
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: c.border }}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.9, delay: 0.35, ease: "easeOut" }}
                      />
                    </div>
                    <span className="text-xs font-semibold shrink-0" style={{ color: "#6b7280" }}>{unlocked}/{total}</span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>

        {/* ── Category filter ─────────────────────────────────────── */}
        <div className="mb-10">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory(null)}
              className="px-4 py-2 rounded-full text-sm font-bold transition-all"
              style={{
                backgroundColor: selectedCategory === null ? "#3891A6" : "rgba(56,145,166,0.08)",
                color: selectedCategory === null ? "#fff" : "#3891A6",
                border: `1px solid ${selectedCategory === null ? "#3891A6" : "rgba(56,145,166,0.2)"}`,
              }}
            >
              🏅 All
            </button>
            {categories.map((cat) => {
              const meta = CATEGORY_META[cat];
              const active = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className="px-4 py-2 rounded-full text-sm font-bold transition-all capitalize"
                  style={{
                    backgroundColor: active ? "#FDE74C" : "rgba(253,231,76,0.06)",
                    color: active ? "#020202" : "#FDE74C",
                    border: `1px solid ${active ? "#FDE74C" : "rgba(253,231,76,0.18)"}`,
                  }}
                >
                  {meta.icon} {meta.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Achievement grid ────────────────────────────────────── */}
        {filteredAchievements.length === 0 ? (
          <div className="text-center py-24 rounded-2xl" style={{ border: "1px solid rgba(255,255,255,0.06)", backgroundColor: "rgba(255,255,255,0.02)" }}>
            <p className="text-4xl mb-4">🔒</p>
            <p className="font-semibold" style={{ color: "#6b7280" }}>No achievements in this category yet.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredAchievements.map((achievement, i) => {
              const c = rarityColors[achievement.rarity as Rarity] ?? rarityColors["common"];
              const canAutoCollect = AUTO_UNLOCK_TYPES.includes(achievement.conditionType || "");
              const isReady = !achievement.unlocked && achievement.progressPercentage === 100 && canAutoCollect;
              const pct = achievement.progressPercentage ?? 0;

              return (
                <motion.div
                  id={`achievement-${achievement.id}`}
                  key={achievement.id}
                  custom={i}
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  className="rounded-2xl p-5 flex flex-col relative overflow-hidden transition-transform hover:-translate-y-0.5"
                  style={{
                    backgroundColor: achievement.unlocked
                      ? `${c.bg}`
                      : isReady
                      ? "rgba(255,255,255,0.03)"
                      : "rgba(255,255,255,0.02)",
                    border: `1px solid ${achievement.unlocked ? c.border : isReady ? c.border : "rgba(255,255,255,0.07)"}`,
                    boxShadow: achievement.unlocked
                      ? `0 0 28px ${c.border}28`
                      : isReady
                      ? `0 0 20px ${c.border}20`
                      : "none",
                    opacity: !achievement.unlocked && !isReady && pct === 0 ? 0.55 : 1,
                  }}
                >
                  {/* Locked overlay tint */}
                  {!achievement.unlocked && !isReady && (
                    <div className="absolute inset-0 rounded-2xl pointer-events-none" style={{ backgroundColor: "rgba(0,0,0,0.25)" }} />
                  )}

                  {/* Rarity shimmer for unlocked */}
                  {achievement.unlocked && (
                    <div
                      className="absolute inset-0 rounded-2xl pointer-events-none"
                      style={{ background: `linear-gradient(135deg, ${c.border}10 0%, transparent 60%)` }}
                    />
                  )}

                  {/* Top row */}
                  <div className="flex items-start justify-between mb-4 relative z-10">
                    <div
                      className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl shrink-0"
                      style={{
                        backgroundColor: achievement.unlocked ? `${c.border}20` : "rgba(255,255,255,0.04)",
                        border: `1px solid ${achievement.unlocked ? c.border + "40" : "rgba(255,255,255,0.07)"}`,
                        filter: achievement.unlocked ? `drop-shadow(0 0 10px ${c.text}60)` : "grayscale(0.7) opacity(0.7)",
                      }}
                    >
                      {achievement.icon}
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <span
                        className="text-xs font-black px-2.5 py-1 rounded-full capitalize tracking-wide"
                        style={{ backgroundColor: `${c.border}18`, color: c.text, border: `1px solid ${c.border}40` }}
                      >
                        {achievement.rarity}
                      </span>
                      {achievement.unlocked && (
                        <span className="text-xs font-bold" style={{ color: "#34d399" }}>✓ Unlocked</span>
                      )}
                      {isReady && (
                        <motion.span
                          animate={{ opacity: [1, 0.5, 1] }}
                          transition={{ duration: 1.2, repeat: Infinity }}
                          className="text-xs font-black px-2.5 py-1 rounded-full"
                          style={{ backgroundColor: `${c.border}25`, color: c.text }}
                        >
                          ⭐ Ready!
                        </motion.span>
                      )}
                    </div>
                  </div>

                  {/* Title + description */}
                  <div className="relative z-10 flex-1">
                    <h4 className="font-black text-white mb-1.5 leading-snug">{achievement.title}</h4>
                    <p className="text-xs leading-relaxed mb-4" style={{ color: "#9ca3af" }}>
                      {achievement.description}
                    </p>
                  </div>

                  {/* How to unlock */}
                  <div
                    className="rounded-xl px-3 py-2.5 mb-4 relative z-10"
                    style={{ backgroundColor: "rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.06)" }}
                  >
                    <p className="text-xs font-black uppercase tracking-wider mb-1" style={{ color: c.text }}>How to unlock</p>
                    <p className="text-xs" style={{ color: "#6b7280" }}>{achievement.requirement}</p>
                  </div>

                  {/* Progress bar (locked only) */}
                  {!achievement.unlocked && pct !== undefined && (
                    <div className="relative z-10 mb-4">
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-xs font-semibold" style={{ color: "#6b7280" }}>Progress</span>
                        <span className="text-xs font-black" style={{ color: c.text }}>{Math.round(pct)}%</span>
                      </div>
                      <div className="w-full rounded-full overflow-hidden" style={{ height: "5px", backgroundColor: "rgba(255,255,255,0.06)" }}>
                        <motion.div
                          className="h-full rounded-full"
                          style={{ backgroundColor: c.border }}
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Collect button */}
                  {isReady && (
                    <motion.button
                      onClick={() => collectAchievement(achievement.id)}
                      disabled={collecting === achievement.id}
                      className="w-full rounded-xl py-2.5 font-black text-sm relative z-10 overflow-hidden"
                      style={{
                        backgroundColor: c.border,
                        color: "#020202",
                        opacity: collecting === achievement.id ? 0.6 : 1,
                        cursor: collecting === achievement.id ? "not-allowed" : "pointer",
                      }}
                      animate={collecting !== achievement.id ? { boxShadow: [`0 0 10px ${c.border}40`, `0 0 22px ${c.border}70`, `0 0 10px ${c.border}40`] } : {}}
                      transition={{ duration: 1.6, repeat: Infinity }}
                    >
                      {collecting === achievement.id ? "⏳ Collecting…" : "🎉 Collect!"}
                    </motion.button>
                  )}

                  {/* Unlocked date */}
                  {achievement.unlocked && achievement.unlockedAt && (
                    <p className="text-xs mt-2 relative z-10" style={{ color: c.text }}>
                      Unlocked {new Date(achievement.unlockedAt).toLocaleDateString()}
                    </p>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
