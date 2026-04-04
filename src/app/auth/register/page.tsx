"use client";

import { useState, useEffect, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [referralCode, setReferralCode] = useState("");
  const [tosAccepted, setTosAccepted] = useState(false);
  const [honeypot, setHoneypot] = useState("");

  useEffect(() => {
    // Get referral code from URL params
    const ref = searchParams.get("ref");
    if (ref) {
      setReferralCode(ref);
    }
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (!tosAccepted) {
      setError("You must accept the Terms of Service to create an account.");
      return;
    }

    // Client-side honeypot guard
    if (honeypot) return;

    setLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, website: honeypot, referralCode: referralCode || undefined }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.error || "Registration failed");
        return;
      }

      // In production we require email verification; guide the user instead of auto-signing-in.
      if (data?.requireVerification) {
        router.push(`/auth/verify-sent?email=${encodeURIComponent(email)}`);
        return;
      }

      // Sign in after successful registration
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(result.error);
      } else {
        router.push("/dashboard");
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen flex items-center justify-center px-4 pt-16" style={{ backgroundColor: '#020202', backgroundImage: 'linear-gradient(135deg, #020202 0%, #0a0a0a 50%, #020202 100%)' }}>
      <div className="w-full max-w-md">
        <div className="border rounded-lg p-8" style={{ backgroundColor: 'rgba(76, 91, 92, 0.6)', borderColor: '#3891A6' }}>
          <div className="flex justify-center mb-2">
            <img src="/images/puzzle_warz_logo.png" alt="Puzzle Warz Logo" className="h-48 w-auto max-w-md" />
          </div>
          <p style={{ color: '#3891A6' }} className="text-center mb-8">Create your account</p>

          {error && (
            <div className="mb-6 p-4 rounded-lg text-sm border" style={{ backgroundColor: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.4)', color: '#fca5a5' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Honeypot — visually hidden, real users never see or fill this */}
            <div aria-hidden="true" style={{ position: "absolute", left: "-9999px", width: 1, height: 1, overflow: "hidden" }}>
              <label htmlFor="website">Website</label>
              <input
                id="website"
                name="website"
                type="text"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#3891A6' }}>
                Display Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-4 py-2 rounded-lg text-white placeholder-gray-400 focus:outline-none transition"
                placeholder="Display name"
                style={{ backgroundColor: '#2a3a3b', borderWidth: '2px', borderColor: '#3891A6' }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#FDE74C'}
                onBlur={(e) => e.currentTarget.style.borderColor = '#3891A6'}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#3891A6' }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2 rounded-lg text-white placeholder-gray-400 focus:outline-none transition"
                placeholder="you@example.com"
                style={{ backgroundColor: '#2a3a3b', borderWidth: '2px', borderColor: '#3891A6' }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#FDE74C'}
                onBlur={(e) => e.currentTarget.style.borderColor = '#3891A6'}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#3891A6' }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-2 rounded-lg text-white placeholder-gray-400 focus:outline-none transition"
                placeholder="••••••••"
                style={{ backgroundColor: '#2a3a3b', borderWidth: '2px', borderColor: '#3891A6' }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#FDE74C'}
                onBlur={(e) => e.currentTarget.style.borderColor = '#3891A6'}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#3891A6' }}>
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full px-4 py-2 rounded-lg text-white placeholder-gray-400 focus:outline-none transition"
                placeholder="••••••••"
                style={{ backgroundColor: '#2a3a3b', borderWidth: '2px', borderColor: '#3891A6' }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#FDE74C'}
                onBlur={(e) => e.currentTarget.style.borderColor = '#3891A6'}
              />
            </div>

            {/* Terms of Service */}
            <div className="flex items-start gap-3 pt-1">
              <input
                id="tos"
                type="checkbox"
                checked={tosAccepted}
                onChange={(e) => setTosAccepted(e.target.checked)}
                className="mt-0.5 shrink-0 h-4 w-4 rounded cursor-pointer accent-[#3891A6]"
              />
              <label htmlFor="tos" className="text-sm leading-snug cursor-pointer" style={{ color: '#888' }}>
                I have read and agree to the{" "}
                <Link href="/terms" target="_blank" className="font-semibold underline underline-offset-2 hover:opacity-80 transition-opacity" style={{ color: '#3891A6' }}>
                  Terms of Service
                </Link>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading || !tosAccepted}
              className="w-full py-2 rounded-lg font-semibold transition disabled:opacity-40 hover:opacity-90"
              style={{ backgroundColor: '#3891A6', color: '#020202' }}
            >
              {loading ? "Creating account..." : "Create Account"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p style={{ color: '#3891A6' }}>
              Already have an account?{" "}
              <Link href="/auth/signin" className="font-semibold" style={{ color: '#FDE74C' }}>
                Sign in here
              </Link>
            </p>
          </div>

          <div className="mt-6 pt-6 text-center" style={{ borderTopColor: '#3891A6', borderTopWidth: '1px' }}>
            <Link href="/" style={{ color: '#3891A6' }} className="text-sm hover:opacity-80">
              ← Back to home
            </Link>
          </div>
        </div>
      </div>
    </main>
    </>
  );
}

export default function Register() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RegisterForm />
    </Suspense>
  );
}
