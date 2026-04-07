"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import NotificationSettings from "@/components/NotificationSettings";

export default function SettingsPage() {
  const { status } = useSession();
  const router = useRouter();
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [marketingLoading, setMarketingLoading] = useState(true);
  const [marketingSaving, setMarketingSaving] = useState(false);

  // Password change
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    (async () => {
      try {
        const res = await fetch("/api/user/marketing-preference");
        if (res.ok) {
          const data = await res.json();
          setMarketingOptIn(data.marketingOptIn);
        }
      } catch {}
      setMarketingLoading(false);
    })();
  }, [status]);

  async function toggleMarketing() {
    setMarketingSaving(true);
    try {
      const res = await fetch("/api/user/marketing-preference", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ marketingOptIn: !marketingOptIn }),
      });
      if (res.ok) {
        setMarketingOptIn(!marketingOptIn);
      }
    } catch {}
    setMarketingSaving(false);
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwError(null);
    setPwSuccess(false);
    if (newPassword !== confirmPassword) {
      setPwError("New passwords do not match");
      return;
    }
    if (newPassword.length < 8) {
      setPwError("Password must be at least 8 characters");
      return;
    }
    setPwSaving(true);
    try {
      const res = await fetch("/api/user/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPwError(data.error ?? "Failed to change password");
        return;
      }
      setPwSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setPwError("Network error. Please try again.");
    } finally {
      setPwSaving(false);
    }
  }

  if (status === "loading" || status === "unauthenticated") {
    return null;
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-24 pb-20 px-4" style={{ backgroundColor: "#020202" }}>
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold text-white mb-2">Settings</h1>
          <p className="text-sm mb-8" style={{ color: "#888" }}>Manage your notification and email preferences</p>

          {/* Notification Preferences */}
          <NotificationSettings />

          {/* Marketing Opt-In */}
          <div
            className="mt-8 p-6 rounded-lg border"
            style={{
              backgroundColor: "rgba(56, 145, 166, 0.08)",
              borderColor: "#3891A6",
            }}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl">📣</span>
                <div>
                  <h3 className="font-semibold text-white">Promotions &amp; Updates</h3>
                  <p style={{ color: "#AB9F9D" }} className="text-sm">
                    Receive emails about new features, events, and special offers
                  </p>
                </div>
              </div>
              <button
                onClick={toggleMarketing}
                disabled={marketingLoading || marketingSaving}
                className="shrink-0 px-4 py-2 rounded-lg font-medium transition-all disabled:opacity-50"
                style={{
                  backgroundColor: marketingOptIn ? "#38D399" : "#AB9F9D",
                  color: "#020202",
                }}
              >
                {marketingLoading ? "..." : marketingOptIn ? "Subscribed" : "Unsubscribed"}
              </button>
            </div>
          </div>

          {/* Change Password */}
          <div
            className="mt-8 p-6 rounded-lg border"
            style={{ backgroundColor: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.1)" }}
          >
            <h2 className="text-lg font-semibold text-white mb-1">Change Password</h2>
            <p className="text-sm mb-5" style={{ color: "#888" }}>
              Update the password for your account.
            </p>
            <form onSubmit={handleChangePassword} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-400">Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  autoComplete="current-password"
                  className="rounded-lg px-4 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-[#3891A6]"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}
                  required
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-400">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  className="rounded-lg px-4 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-[#3891A6]"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}
                  required
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-400">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  className="rounded-lg px-4 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-[#3891A6]"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}
                  required
                />
              </div>
              {pwError && <p className="text-sm text-red-400">{pwError}</p>}
              {pwSuccess && <p className="text-sm text-green-400">Password changed successfully!</p>}
              <button
                type="submit"
                disabled={pwSaving}
                className="self-start px-5 py-2 rounded-lg text-sm font-bold transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                style={{ background: "#3891A6", color: "#fff" }}
              >
                {pwSaving ? "Saving…" : "Update Password"}
              </button>
            </form>
          </div>
        </div>
      </main>
    </>
  );
}
