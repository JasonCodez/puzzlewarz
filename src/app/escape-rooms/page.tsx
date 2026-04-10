
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import Link from "next/link";
import AdminEscapeRoomsPanel from "./_AdminPanel";

export const metadata = { title: "Escape Rooms | PuzzleWarz" };

export default async function EscapeRoomsPage() {
  const session = await getServerSession(authOptions);

  if (session?.user) {
    const user = await prisma.user.findUnique({
      where: { id: (session.user as { id: string }).id },
      select: { role: true },
    });
    if (user?.role === "admin") {
      return <AdminEscapeRoomsPanel />;
    }
  }

  // ── Coming Soon page for everyone else ──────────────────────
  return (
    <main
      style={{
        backgroundColor: "#020202",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "60px 16px",
        textAlign: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <style>{`
        @keyframes pw-orb-escape {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50%       { transform: translate(40px, -30px) scale(1.08); }
        }
        @keyframes escape-badge-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(124,58,237,0.4); }
          50%       { box-shadow: 0 0 0 10px rgba(124,58,237,0); }
        }
        @keyframes escape-lock-float {
          0%, 100% { transform: translateY(0px) rotate(-4deg); }
          50%       { transform: translateY(-12px) rotate(4deg); }
        }
        @keyframes escape-glow-pulse {
          0%, 100% { opacity: 0.6; }
          50%       { opacity: 1; }
        }
      `}</style>

      {/* Background orbs */}
      <div aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        <div style={{ position: "absolute", top: "15%", left: "10%", width: 420, height: 420, borderRadius: "50%", background: "radial-gradient(circle, rgba(124,58,237,0.14) 0%, transparent 70%)", animation: "pw-orb-escape 20s ease-in-out infinite" }} />
        <div style={{ position: "absolute", bottom: "10%", right: "8%", width: 320, height: 320, borderRadius: "50%", background: "radial-gradient(circle, rgba(124,58,237,0.08) 0%, transparent 70%)", animation: "pw-orb-escape 26s ease-in-out infinite reverse" }} />
        <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle, rgba(124,58,237,0.25) 1px, transparent 1px)", backgroundSize: "40px 40px", opacity: 0.035 }} />
      </div>

      <div style={{ position: "relative", maxWidth: 580 }}>
        {/* Animated lock icon */}
        <div
          aria-hidden
          style={{
            fontSize: 72,
            marginBottom: 32,
            display: "block",
            animation: "escape-lock-float 4s ease-in-out infinite",
            filter: "drop-shadow(0 0 24px rgba(124,58,237,0.7))",
          }}
        >
          🔐
        </div>

        {/* Coming Soon badge */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 16px",
            borderRadius: 999,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "#a78bfa",
            backgroundColor: "rgba(124,58,237,0.1)",
            border: "1px solid rgba(124,58,237,0.35)",
            marginBottom: 28,
            animation: "escape-badge-pulse 2.5s ease-in-out infinite",
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              backgroundColor: "#a78bfa",
              boxShadow: "0 0 8px #a78bfa",
              animation: "escape-glow-pulse 2s ease-in-out infinite",
            }}
          />
          Coming Soon
        </div>

        <h1
          style={{
            fontSize: "clamp(36px, 6vw, 62px)",
            fontWeight: 900,
            color: "#fff",
            letterSpacing: "-0.03em",
            lineHeight: 1.08,
            marginBottom: 20,
          }}
        >
          Escape Rooms
        </h1>

        <p
          style={{
            fontSize: 18,
            color: "#9CA3AF",
            lineHeight: 1.7,
            marginBottom: 14,
            maxWidth: 460,
            margin: "0 auto 14px",
          }}
        >
          Collaborative multi-stage puzzle rooms are in development.
        </p>
        <p
          style={{
            fontSize: 15,
            color: "#6B7280",
            lineHeight: 1.65,
            maxWidth: 420,
            margin: "0 auto 48px",
          }}
        >
          Team up with up to 4 players, race the clock, and solve layered puzzles
          that unlock one stage at a time. Only the sharpest minds make it out.
        </p>

        {/* Teaser feature pills */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: 10,
            marginBottom: 52,
          }}
        >
          {[
            "👥 1 – 4 Players",
            "⏱️ Timed Stages",
            "🔗 Chained Puzzles",
            "📡 Live Sync",
            "🏆 Leaderboard",
          ].map((pill) => (
            <span
              key={pill}
              style={{
                padding: "8px 16px",
                borderRadius: 999,
                fontSize: 13,
                fontWeight: 600,
                color: "#a78bfa",
                backgroundColor: "rgba(124,58,237,0.08)",
                border: "1px solid rgba(124,58,237,0.25)",
              }}
            >
              {pill}
            </span>
          ))}
        </div>

        {/* CTA strip */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
          <Link
            href="/daily"
            style={{
              padding: "14px 30px",
              borderRadius: 10,
              fontWeight: 700,
              fontSize: 14,
              color: "#fff",
              backgroundColor: "#7C3AED",
              boxShadow: "0 0 32px rgba(124,58,237,0.45)",
              textDecoration: "none",
              display: "inline-block",
              transition: "transform 0.2s, box-shadow 0.2s",
            }}
          >
            Play Today&apos;s Daily →
          </Link>
          <Link
            href="/puzzles"
            style={{
              padding: "14px 28px",
              borderRadius: 10,
              fontWeight: 600,
              fontSize: 14,
              color: "#a78bfa",
              backgroundColor: "transparent",
              border: "1px solid rgba(124,58,237,0.35)",
              textDecoration: "none",
              display: "inline-block",
              transition: "border-color 0.2s, background-color 0.2s",
            }}
          >
            Browse Puzzles
          </Link>
        </div>

        <p
          style={{
            marginTop: 44,
            fontSize: 13,
            color: "#4B5563",
          }}
        >
          Stay sharp — escape rooms open to our top solvers first.
        </p>
      </div>
    </main>
  );
}
