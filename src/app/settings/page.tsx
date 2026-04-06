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
            <div className="flex items-center justify-between">
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
                className="px-4 py-2 rounded-lg font-medium transition-all disabled:opacity-50"
                style={{
                  backgroundColor: marketingOptIn ? "#38D399" : "#AB9F9D",
                  color: "#020202",
                }}
              >
                {marketingLoading ? "..." : marketingOptIn ? "Subscribed" : "Unsubscribed"}
              </button>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
