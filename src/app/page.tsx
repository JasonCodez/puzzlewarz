import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Puzzle Warz — Solve Challenges, Compete & Win",
  description:
    "Crack ARG-style puzzles solo or with your team. Earn points, climb real-time leaderboards, and unlock achievements on the ultimate multiplayer puzzle platform.",
  alternates: { canonical: "https://puzzlewarz.com" },
  openGraph: {
    title: "Puzzle Warz — Solve Challenges, Compete & Win",
    description:
      "Crack ARG-style puzzles solo or with your team. Earn points, climb real-time leaderboards, and unlock achievements.",
    url: "https://puzzlewarz.com",
    type: "website",
  },
};

export default function Home() {
  return (
    <main style={{ backgroundColor: '#020202' }} className="min-h-screen">
      {/* Hero Section */}
      <div className="pt-24 pb-20 px-4 hero-bg">
        <div className="max-w-5xl mx-auto">
          <div className="mb-12">
            <span
              className="inline-block text-xs font-bold tracking-widest uppercase px-3 py-1 rounded-full mb-6"
              style={{ color: '#FDE74C', backgroundColor: 'rgba(253,231,76,0.08)', border: '1px solid rgba(253,231,76,0.22)' }}
            >Puzzle Solving Platform</span>
            <h1 className="text-6xl md:text-7xl font-bold text-white mt-2 leading-tight tracking-tight">
              Solve Puzzles<br/>
              <span style={{ color: '#3891A6', textShadow: '0 0 48px rgba(56,145,166,0.45)' }}>Solo or Together</span>
            </h1>
            <p className="text-xl mt-6 max-w-2xl" style={{ color: '#DDDBF1' }}>
              Crack puzzles at your own pace, solo or with teams. Earn points, compete on leaderboards, and master the ultimate cryptic challenge—your way.
            </p>
          </div>

          <div className="flex gap-4 flex-wrap">
            <Link
              href="/auth/register"
              className="px-8 py-3.5 rounded-lg font-bold text-sm tracking-wide text-white transition-all duration-200 hover:brightness-110 hover:scale-[1.02]"
              style={{ backgroundColor: '#3891A6', boxShadow: '0 0 28px rgba(56, 145, 166, 0.45)', letterSpacing: '0.06em' }}
            >
              Start Solving →
            </Link>
            <Link
              href="/auth/signin"
              className="px-8 py-3.5 rounded-lg font-semibold text-sm transition-all duration-200 hover:bg-[rgba(56,145,166,0.12)]"
              style={{ border: '1px solid rgba(56,145,166,0.45)', color: '#9BD1D6', backgroundColor: 'transparent' }}
            >
              Sign In
            </Link>

          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="px-4 py-20 max-w-6xl mx-auto">
        <h2 className="text-4xl font-bold text-white mb-4 text-center tracking-tight">Why Puzzle Warz?</h2>
        <p className="text-center mb-16" style={{ color: '#DDDBF1' }}>Challenge yourself solo, collaborate with friends, or do both—the choice is yours</p>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Feature 1 */}
          <div className="group rounded-xl p-6 card-hover-teal" style={{ backgroundColor: 'rgba(56, 145, 166, 0.07)', border: '1px solid rgba(56,145,166,0.3)' }}>
            <div className="text-3xl mb-4">🧩</div>
            <h3 className="text-lg font-bold text-white mb-2">Progressive Puzzles</h3>
            <p style={{ color: '#DDDBF1' }} className="text-sm">Unlock challenges in stages with dependencies and smart unlock mechanics</p>
          </div>

          {/* Feature 2 */}
          <div className="group rounded-xl p-6 card-hover-yellow" style={{ backgroundColor: 'rgba(253, 231, 76, 0.05)', border: '1px solid rgba(253,231,76,0.28)' }}>
            <div className="text-3xl mb-4">🎯</div>
            <h3 className="text-lg font-bold text-white mb-2">Solo or Team</h3>
            <p style={{ color: '#DDDBF1' }} className="text-sm">Play solo for a personal challenge or team up with friends for collaborative mystery solving</p>
          </div>

          {/* Feature 3 */}
          <div className="group rounded-xl p-6 card-hover-teal" style={{ backgroundColor: 'rgba(56, 145, 166, 0.04)', border: '1px solid rgba(56,145,166,0.18)' }}>
            <div className="text-3xl mb-4">🏆</div>
            <h3 className="text-lg font-bold text-white mb-2">Live Leaderboards</h3>
            <p style={{ color: '#DDDBF1' }} className="text-sm">Track your position globally and compete against other teams in real-time</p>
          </div>

          {/* Feature 4 */}
          <div className="group rounded-xl p-6 card-hover-teal" style={{ backgroundColor: 'rgba(56, 145, 166, 0.07)', border: '1px solid rgba(56,145,166,0.3)' }}>
            <div className="text-3xl mb-4">⚡</div>
            <h3 className="text-lg font-bold text-white mb-2">Strategic Hints</h3>
            <p style={{ color: '#DDDBF1' }} className="text-sm">Use hints wisely to overcome obstacles while managing your point multiplier</p>
          </div>

          {/* Feature 5 */}
          <div className="group rounded-xl p-6 card-hover-yellow" style={{ backgroundColor: 'rgba(253, 231, 76, 0.05)', border: '1px solid rgba(253,231,76,0.28)' }}>
            <div className="text-3xl mb-4">📊</div>
            <h3 className="text-lg font-bold text-white mb-2">Instant Feedback</h3>
            <p style={{ color: '#DDDBF1' }} className="text-sm">Get real-time scoring updates and track your progress through challenges</p>
          </div>

          {/* Feature 6 */}
          <div className="group rounded-xl p-6 card-hover-teal" style={{ backgroundColor: 'rgba(56, 145, 166, 0.04)', border: '1px solid rgba(56,145,166,0.18)' }}>
            <div className="text-3xl mb-4">🎯</div>
            <h3 className="text-lg font-bold text-white mb-2">Achievements</h3>
            <p style={{ color: '#DDDBF1' }} className="text-sm">Unlock badges and milestones as you progress through the puzzle universe</p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="px-4 py-24" style={{ background: 'radial-gradient(ellipse at 50% 50%, rgba(56,145,166,0.12) 0%, rgba(56,145,166,0.03) 60%, transparent 100%)', borderTop: '1px solid rgba(56,145,166,0.2)', borderBottom: '1px solid rgba(56,145,166,0.2)' }}>
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-4 tracking-tight">Start Your Puzzle Journey</h2>
          <p className="text-lg mb-10" style={{ color: '#9BD1D6' }}>Whether you prefer solving solo or with a team, your adventure awaits</p>
          <Link
            href="/auth/register"
            className="inline-block px-10 py-4 rounded-lg font-bold text-sm tracking-wide text-white transition-all duration-200 hover:brightness-115 hover:scale-[1.03]"
            style={{ backgroundColor: '#3891A6', boxShadow: '0 0 36px rgba(56, 145, 166, 0.5)', letterSpacing: '0.06em' }}
          >
            Get Started Now →
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-16 px-4" style={{ borderTop: '1px solid rgba(56,145,166,0.18)', color: '#DDDBF1' }}>
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center md:items-start gap-10 mb-10">
            <div className="flex flex-col items-center md:items-start gap-2">
              <div className="flex items-center gap-2">
                <img src="/images/puzzle_warz_logo.png" alt="Puzzle Warz Logo" className="h-8 w-auto" />
                <span className="text-xs font-bold tracking-widest uppercase" style={{ color: '#3891A6' }}>Puzzle Warz</span>
              </div>
              <p className="text-xs mt-1" style={{ color: '#444' }}>The ultimate multiplayer puzzle platform</p>
            </div>
            <div className="flex gap-12 text-sm">
              <div className="flex flex-col gap-3">
                <p className="text-xs font-bold tracking-widest uppercase" style={{ color: '#3891A6' }}>Play</p>
                <Link href="/auth/register" className="text-[#555] hover:text-white transition-colors duration-200">Puzzles</Link>
                <Link href="/auth/register" className="text-[#555] hover:text-white transition-colors duration-200">Daily Challenge</Link>
                <Link href="/auth/register" className="text-[#555] hover:text-white transition-colors duration-200">Teams</Link>
              </div>
              <div className="flex flex-col gap-3">
                <p className="text-xs font-bold tracking-widest uppercase" style={{ color: '#3891A6' }}>Compete</p>
                <Link href="/auth/register" className="text-[#555] hover:text-white transition-colors duration-200">Leaderboards</Link>
                <Link href="/auth/register" className="text-[#555] hover:text-white transition-colors duration-200">Achievements</Link>
                <Link href="/auth/register" className="text-[#555] hover:text-white transition-colors duration-200">Learn</Link>
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row justify-between items-center gap-2 pt-6" style={{ borderTop: '1px solid rgba(56,145,166,0.1)' }}>
            <p className="text-xs" style={{ color: '#333' }}>&copy; 2026 Puzzle Warz &middot; All rights reserved</p>
            <p className="text-xs" style={{ color: '#333' }}>Collaborative Puzzle Platform</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
