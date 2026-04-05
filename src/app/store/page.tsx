"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";

interface StoreItem {
  id: string;
  key: string;
  name: string;
  description: string;
  category: string;
  subcategory: string;
  price: number;
  isConsumable: boolean;
  iconEmoji: string;
  metadata: Record<string, unknown> | null;
  owned: number;
}

interface StoreUser {
  totalPoints: number;
  activeTheme: string;
  activeFrame: string;
  activeSkin: string;
  activeFlair: string;
  teamBannerColor: string;
  streakShields: number;
  hintTokens: number;
  skipTokens: number;
  warzChallengeSlots: number;
  warzRematchTokens: number;
}

const CATEGORIES = [
  { key: "all",      label: "All Items",    emoji: "🛍️" },
  { key: "streak",   label: "Streak",       emoji: "🔥" },
  { key: "puzzle",   label: "Puzzle",       emoji: "🧩" },
  { key: "warz",     label: "Warz",         emoji: "⚔️" },
  { key: "cosmetic", label: "Cosmetics",    emoji: "✨" },
  { key: "social",   label: "Team",         emoji: "🏆" },
];

const SUBCATEGORY_LABELS: Record<string, string> = {
  token: "Token",
  slot: "Slot Upgrade",
  theme: "Profile Theme",
  frame: "Avatar Frame",
  skin: "Puzzle Skin",
  flair: "Name Flair",
  banner: "Team Banner",
};

function getActiveValue(item: StoreItem, user: StoreUser): string | null {
  if (item.subcategory === "theme") return user.activeTheme;
  if (item.subcategory === "frame") return user.activeFrame;
  if (item.subcategory === "skin") return user.activeSkin;
  if (item.subcategory === "flair") return user.activeFlair;
  if (item.subcategory === "banner") return user.teamBannerColor;
  return null;
}

function isEquipped(item: StoreItem, user: StoreUser): boolean {
  const meta = item.metadata as { value?: string; emoji?: string } | null;
  // Flair items store the emoji in activeFlair; other items store the plain value.
  const value = item.subcategory === "flair"
    ? (meta?.emoji ?? meta?.value ?? item.key)
    : (meta?.value ?? item.key);
  const active = getActiveValue(item, user);
  return active !== null && active === value;
}

export default function StorePage() {
  const { status } = useSession();
  const [items, setItems] = useState<StoreItem[]>([]);
  const [user, setUser] = useState<StoreUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("all");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [equipping, setEquipping] = useState<string | null>(null);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchStore = useCallback(async () => {
    try {
      const res = await fetch("/api/store", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setItems(data.items ?? []);
      setUser(data.user ?? null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated") fetchStore();
    else if (status === "unauthenticated") setLoading(false);
  }, [status, fetchStore]);

  const handlePurchase = async (item: StoreItem) => {
    if (purchasing) return;
    setPurchasing(item.key);
    try {
      const res = await fetch("/api/store/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemKey: item.key }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error ?? "Purchase failed", "error");
        return;
      }
      showToast(`${item.iconEmoji} ${item.name} purchased!`);
      fetchStore();
    } finally {
      setPurchasing(null);
    }
  };

  const handleEquip = async (item: StoreItem, unequip = false) => {
    if (equipping) return;
    setEquipping(item.key);
    try {
      const res = await fetch("/api/store/equip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemKey: unequip ? `unequip_${item.subcategory}` : item.key }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error ?? "Failed to equip", "error");
        return;
      }
      showToast(unequip ? "Unequipped" : `${item.iconEmoji} ${item.name} equipped!`);
      fetchStore();
    } finally {
      setEquipping(null);
    }
  };

  const filtered = activeCategory === "all"
    ? items
    : items.filter((i) => i.category === activeCategory);

  if (status === "unauthenticated") {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#0a0c10" }}>
        <p className="text-white">Please sign in to access the store.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 pt-28 pb-12" style={{ backgroundColor: "#0a0c10" }}>
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-extrabold text-white mb-1">🛍️ Point Store</h1>
          <p style={{ color: "#AB9F9D" }}>Spend your hard-earned points on upgrades, cosmetics, and power-ups.</p>
        </div>

        {/* Balance bar */}
        <div
          className="flex items-center justify-between rounded-xl px-6 py-4 mb-8"
          style={{ backgroundColor: "rgba(15,18,25,0.95)", border: "1px solid rgba(253,231,76,0.25)" }}
        >
          <div>
            <p className="text-sm font-semibold" style={{ color: "#AB9F9D" }}>Your Balance</p>
            <p className="text-3xl font-extrabold" style={{ color: "#FDE74C" }}>
              {user?.totalPoints.toLocaleString() ?? "—"} <span className="text-lg font-semibold">pts</span>
            </p>
          </div>
          {user && (
            <div className="flex flex-wrap gap-3 text-sm">
              {user.streakShields > 0 && (
                <span className="px-3 py-1 rounded-full font-semibold" style={{ backgroundColor: "rgba(34,197,94,0.12)", color: "#4ade80" }}>
                  🛡️ {user.streakShields} shields
                </span>
              )}
              {user.hintTokens > 0 && (
                <span className="px-3 py-1 rounded-full font-semibold" style={{ backgroundColor: "rgba(253,231,76,0.1)", color: "#FDE74C" }}>
                  💡 {user.hintTokens} hints
                </span>
              )}
              {user.skipTokens > 0 && (
                <span className="px-3 py-1 rounded-full font-semibold" style={{ backgroundColor: "rgba(139,92,246,0.12)", color: "#a78bfa" }}>
                  ⏭️ {user.skipTokens} skips
                </span>
              )}
              {user.warzChallengeSlots > 3 && (
                <span className="px-3 py-1 rounded-full font-semibold" style={{ backgroundColor: "rgba(239,68,68,0.1)", color: "#fca5a5" }}>
                  ⚔️ {user.warzChallengeSlots} slots
                </span>
              )}
            </div>
          )}
        </div>

        {/* Category tabs */}
        <div className="flex gap-2 flex-wrap mb-8">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              className="px-4 py-2 rounded-xl text-sm font-semibold transition-all"
              style={{
                backgroundColor: activeCategory === cat.key ? "rgba(253,231,76,0.18)" : "rgba(255,255,255,0.05)",
                border: `1px solid ${activeCategory === cat.key ? "rgba(253,231,76,0.5)" : "rgba(255,255,255,0.1)"}`,
                color: activeCategory === cat.key ? "#FDE74C" : "#9ca3af",
              }}
            >
              {cat.emoji} {cat.label}
            </button>
          ))}
        </div>

        {/* Items grid */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <p className="text-white text-lg">Loading store…</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((item) => {
              const owned = item.owned > 0;
              const equipped = user ? isEquipped(item, user) : false;
              const canAfford = (user?.totalPoints ?? 0) >= item.price;
              const isCosmetic = ["theme", "frame", "skin", "flair", "banner"].includes(item.subcategory);
              const isBuying = purchasing === item.key;
              const isEquipping = equipping === item.key;

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl p-5 flex flex-col gap-3"
                  style={{
                    backgroundColor: "rgba(15,18,25,0.95)",
                    border: `1px solid ${equipped ? "rgba(253,231,76,0.5)" : owned ? "rgba(74,222,128,0.25)" : "rgba(255,255,255,0.1)"}`,
                    boxShadow: equipped ? "0 0 12px rgba(253,231,76,0.12)" : "none",
                  }}
                >
                  {/* Top row */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-3xl">{item.iconEmoji}</span>
                      <div>
                        <p className="font-bold text-white text-sm">{item.name}</p>
                        <p className="text-xs" style={{ color: "#6b7280" }}>
                          {SUBCATEGORY_LABELS[item.subcategory] ?? item.subcategory}
                          {item.isConsumable && " · Consumable"}
                        </p>
                      </div>
                    </div>
                    {equipped && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-bold shrink-0"
                        style={{ backgroundColor: "rgba(253,231,76,0.2)", color: "#FDE74C" }}>
                        Equipped
                      </span>
                    )}
                    {!equipped && owned && !item.isConsumable && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-bold shrink-0"
                        style={{ backgroundColor: "rgba(74,222,128,0.12)", color: "#4ade80" }}>
                        Owned
                      </span>
                    )}
                    {item.isConsumable && owned && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-bold shrink-0"
                        style={{ backgroundColor: "rgba(139,92,246,0.15)", color: "#a78bfa" }}>
                        ×{item.owned}
                      </span>
                    )}
                  </div>

                  <p className="text-xs leading-relaxed flex-1" style={{ color: "#AB9F9D" }}>
                    {item.description}
                  </p>

                  {/* Price + actions */}
                  <div className="flex items-center justify-between gap-2 mt-1">
                    <span className="font-extrabold text-sm" style={{ color: canAfford ? "#FFB86B" : "#6b7280" }}>
                      {item.price.toLocaleString()} pts
                    </span>

                    <div className="flex gap-1.5">
                      {/* Buy button — always shown for consumables, only if not owned for non-consumable */}
                      {(item.isConsumable || !owned) && (
                        <button
                          disabled={!canAfford || isBuying}
                          onClick={() => handlePurchase(item)}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-40"
                          style={{ background: canAfford ? "linear-gradient(135deg, #FDE74C, #FFB86B)" : "rgba(255,255,255,0.08)", color: canAfford ? "#1a1400" : "#6b7280" }}
                        >
                          {isBuying ? "…" : "Buy"}
                        </button>
                      )}

                      {/* Equip/Unequip button for owned cosmetics */}
                      {isCosmetic && owned && !item.isConsumable && (
                        equipped ? (
                          <button
                            disabled={!!isEquipping}
                            onClick={() => handleEquip(item, true)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                            style={{ backgroundColor: "rgba(255,255,255,0.07)", color: "#9ca3af" }}
                          >
                            {isEquipping ? "…" : "Unequip"}
                          </button>
                        ) : (
                          <button
                            disabled={!!isEquipping}
                            onClick={() => handleEquip(item)}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                            style={{ backgroundColor: "rgba(74,222,128,0.12)", color: "#4ade80", border: "1px solid rgba(74,222,128,0.25)" }}
                          >
                            {isEquipping ? "…" : "Equip"}
                          </button>
                        )
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}

            {filtered.length === 0 && (
              <div className="col-span-3 py-20 text-center">
                <p className="text-2xl mb-2">🤔</p>
                <p style={{ color: "#AB9F9D" }}>No items in this category.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 rounded-xl text-sm font-semibold shadow-xl z-50"
            style={{
              backgroundColor: toast.type === "success" ? "rgba(15,18,25,0.98)" : "rgba(60,0,0,0.95)",
              border: `1px solid ${toast.type === "success" ? "rgba(253,231,76,0.4)" : "rgba(239,68,68,0.4)"}`,
              color: toast.type === "success" ? "#FDE74C" : "#fca5a5",
            }}
          >
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
