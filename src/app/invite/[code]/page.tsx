"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function InviteLandingPage() {
  const params = useParams();
  const router = useRouter();
  const code = (params?.code as string ?? "").toUpperCase();

  const [referrerName, setReferrerName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    if (!code) return;
    fetch(`/api/user/referral/lookup?code=${encodeURIComponent(code)}`)
      .then((r) => {
        if (!r.ok) { setInvalid(true); setLoading(false); return null; }
        return r.json();
      })
      .then((d) => {
        if (d) setReferrerName(d.name ?? null);
        setLoading(false);
      })
      .catch(() => { setInvalid(true); setLoading(false); });
  }, [code]);

  const registerUrl = `/auth/register?ref=${encodeURIComponent(code)}`;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#020202",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      {/* Logo / wordmark */}
      <div style={{ marginBottom: 40, textAlign: "center" }}>
        <div
          style={{
            fontSize: 32,
            fontWeight: 900,
            letterSpacing: "0.06em",
            color: "#FDE74C",
            textTransform: "uppercase",
          }}
        >
          ⚔️ Puzzle Warz
        </div>
        <div style={{ fontSize: 13, color: "#AB9F9D", marginTop: 4, letterSpacing: "0.1em" }}>
          The competitive puzzle arena
        </div>
      </div>

      {/* Card */}
      <div
        style={{
          width: "100%",
          maxWidth: 460,
          background: "linear-gradient(135deg, #0a0a0a 0%, #020202 100%)",
          border: "1px solid rgba(56,145,166,0.35)",
          borderRadius: 20,
          padding: "40px 36px",
          textAlign: "center",
        }}
      >
        {loading ? (
          <div style={{ color: "#AB9F9D", fontSize: 14, padding: "40px 0" }}>Loading…</div>
        ) : invalid ? (
          <>
            <div style={{ fontSize: 40, marginBottom: 16 }}>🤔</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#FDE74C", marginBottom: 12 }}>
              Invalid invite link
            </div>
            <div style={{ fontSize: 14, color: "#AB9F9D", marginBottom: 32 }}>
              This invite code doesn&rsquo;t exist or has expired.
            </div>
            <Link
              href="/auth/register"
              style={{
                display: "inline-block",
                padding: "14px 32px",
                background: "#3891A6",
                color: "#020202",
                fontWeight: 700,
                fontSize: 15,
                borderRadius: 12,
                textDecoration: "none",
              }}
            >
              Sign up anyway →
            </Link>
          </>
        ) : (
          <>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
            <div
              style={{
                fontSize: 22,
                fontWeight: 900,
                color: "#FDE74C",
                lineHeight: 1.3,
                marginBottom: 12,
              }}
            >
              {referrerName
                ? `${referrerName} invited you to Puzzle Warz!`
                : "You've been invited to Puzzle Warz!"}
            </div>
            <div style={{ fontSize: 14, color: "#AB9F9D", lineHeight: 1.7, marginBottom: 32 }}>
              Join the daily puzzle battle. Solve puzzles, earn points, climb the leaderboard — and make your friends jealous.
            </div>

            {/* Perks */}
            <div
              style={{
                background: "rgba(56,145,166,0.07)",
                border: "1px solid rgba(56,145,166,0.2)",
                borderRadius: 12,
                padding: "16px 20px",
                marginBottom: 32,
                textAlign: "left",
              }}
            >
              {[
                ["🧩", "Daily Word, Gridlock Files & escape rooms"],
                ["🏆", "Global leaderboard & seasonal rewards"],
                ["🔥", "Streak system — keep the fire alive"],
                ["👥", "Team battles & rival notifications"],
              ].map(([emoji, text]) => (
                <div
                  key={text}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    fontSize: 13,
                    color: "#DDDBF1",
                    marginBottom: 10,
                  }}
                >
                  <span style={{ fontSize: 16 }}>{emoji}</span>
                  <span>{text}</span>
                </div>
              ))}
            </div>

            <Link
              href={registerUrl}
              style={{
                display: "block",
                padding: "15px 0",
                background: "#FDE74C",
                color: "#020202",
                fontWeight: 900,
                fontSize: 16,
                borderRadius: 12,
                textDecoration: "none",
                letterSpacing: "0.04em",
              }}
            >
              Create Free Account →
            </Link>
            <div style={{ fontSize: 12, color: "#AB9F9D", marginTop: 14 }}>
              Already have an account?{" "}
              <Link href="/auth/signin" style={{ color: "#3891A6" }}>
                Sign in
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
