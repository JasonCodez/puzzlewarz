"use client";

import { useState, useEffect, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";

const TOS_SECTIONS = [
  { title: "1. Acceptance of Terms", body: `By creating an account or using PuzzleWarz (the "Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, do not access or use the Service. These Terms apply to all visitors, users, and others who access the Service.` },
  { title: "2. Eligibility", body: `You must be at least 13 years old to use the Service. By registering, you represent and warrant that you meet this age requirement. If you are under 18, you confirm that a parent or legal guardian has reviewed and agreed to these Terms on your behalf.` },
  { title: "3. Account Registration", body: `You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account. You agree to provide accurate, complete, and current information during registration. You must notify us immediately at support@puzzlewarz.com if you suspect any unauthorised access to your account. PuzzleWarz reserves the right to terminate accounts that contain false information or violate these Terms.` },
  { title: "4. Acceptable Use", body: `You agree not to:\n• Post or transmit content that is unlawful, harassing, defamatory, obscene, or otherwise objectionable.\n• Attempt to reverse-engineer, cheat, exploit, or manipulate any puzzle, scoring system, or leaderboard.\n• Use automated bots, scripts, or other tools to interact with the Service without express written permission.\n• Impersonate another user, moderator, or PuzzleWarz staff member.\n• Attempt to gain unauthorised access to any part of the Service or its underlying infrastructure.\n• Use the Service to distribute spam, malware, or unsolicited commercial communications.\n\nViolations may result in immediate account suspension or termination without notice.` },
  { title: "5. User-Generated Content", body: `When you create or submit puzzles, forum posts, comments, or other content ("User Content"), you retain ownership of that content. By submitting User Content, you grant PuzzleWarz a worldwide, non-exclusive, royalty-free licence to host, display, reproduce, and distribute that content solely for the purpose of operating and improving the Service.\n\nYou are solely responsible for the accuracy, legality, and appropriateness of your User Content. PuzzleWarz reserves the right to remove any User Content at its sole discretion.` },
  { title: "6. Intellectual Property", body: `All platform code, design, graphics, logos, and original puzzle content created by PuzzleWarz are the exclusive property of PuzzleWarz and protected by applicable intellectual property laws. You may not reproduce, distribute, or create derivative works from any PuzzleWarz proprietary content without prior written consent.` },
  { title: "7. Privacy", body: `Your use of the Service is also governed by our Privacy Policy, which is incorporated into these Terms by reference. We collect and process personal data only as described in the Privacy Policy. By using the Service you consent to such processing and warrant that all data you provide is accurate.` },
  { title: "8. Team Features & Collaborative Play", body: `PuzzleWarz offers team and collaborative puzzle modes. When using these features you agree to interact respectfully with other participants. Harassment, hate speech, or targeted abuse of teammates or opponents is strictly prohibited and may result in permanent removal from the Service.` },
  { title: "9. Service Availability", body: `PuzzleWarz strives for high availability but does not guarantee uninterrupted access to the Service. We reserve the right to modify, suspend, or discontinue any part of the Service at any time with or without notice. PuzzleWarz shall not be liable to you or any third party for any such modification, suspension, or discontinuance.` },
  { title: "10. Disclaimer of Warranties", body: `The Service is provided on an "AS IS" and "AS AVAILABLE" basis without warranties of any kind, either express or implied, including but not limited to implied warranties of merchantability, fitness for a particular purpose, or non-infringement. PuzzleWarz does not warrant that the Service will be error-free, secure, or free of viruses or other harmful components.` },
  { title: "11. Limitation of Liability", body: `To the maximum extent permitted by applicable law, PuzzleWarz and its officers, employees, and partners shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising out of or related to your use of the Service, even if advised of the possibility of such damages. Our total aggregate liability to you shall not exceed the greater of (a) the amount you paid to PuzzleWarz in the twelve months preceding the claim, or (b) USD $10.` },
  { title: "12. Termination", body: `You may close your account at any time by contacting us at support@puzzlewarz.com. PuzzleWarz reserves the right to suspend or permanently terminate your account at any time for violation of these Terms or for any other reason at our sole discretion. Upon termination, your right to use the Service ceases immediately.` },
  { title: "13. Governing Law", body: `These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in which PuzzleWarz operates, without regard to its conflict-of-law provisions. Any disputes arising under these Terms shall be subject to the exclusive jurisdiction of the courts located in that jurisdiction.` },
  { title: "14. Changes to These Terms", body: `We may update these Terms from time to time. When we do, we will revise the "Last Updated" date below and, where the changes are material, notify registered users by email or an in-app notice. Your continued use of the Service after any changes constitutes acceptance of the new Terms.` },
  { title: "15. Contact Us", body: `If you have questions about these Terms, please contact us at:\n\nPuzzleWarz Support\nadmin@puzzlewarz.com` },
];

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
  const [showTos, setShowTos] = useState(false);
  const [emailOptIn, setEmailOptIn] = useState(false);
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
        body: JSON.stringify({ name, email, password, website: honeypot, referralCode: referralCode || undefined, marketingOptIn: emailOptIn }),
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
                <button type="button" onClick={() => setShowTos(true)} className="font-semibold underline underline-offset-2 hover:opacity-80 transition-opacity" style={{ color: '#3891A6' }}>
                  Terms of Service
                </button>
              </label>
            </div>

            {/* Email opt-in */}
            <div className="flex items-start gap-3">
              <input
                id="emailOptIn"
                type="checkbox"
                checked={emailOptIn}
                onChange={(e) => setEmailOptIn(e.target.checked)}
                className="mt-0.5 shrink-0 h-4 w-4 rounded cursor-pointer accent-[#3891A6]"
              />
              <label htmlFor="emailOptIn" className="text-sm leading-snug cursor-pointer" style={{ color: '#888' }}>
                Send me emails about promotions, updates, and new features
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

          {/* TOS Modal */}
          {showTos && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }} onClick={() => setShowTos(false)}>
              <div
                className="w-full max-w-2xl max-h-[80vh] flex flex-col rounded-lg border"
                style={{ backgroundColor: '#1a2a2b', borderColor: '#3891A6' }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 shrink-0" style={{ borderBottom: '1px solid rgba(56,145,166,0.3)' }}>
                  <div>
                    <h2 className="text-lg font-bold text-white">Terms of Service</h2>
                    <p className="text-xs mt-0.5" style={{ color: '#555' }}>Last updated: April 1, 2026</p>
                  </div>
                  <button type="button" onClick={() => setShowTos(false)} className="text-2xl leading-none hover:opacity-70 transition-opacity" style={{ color: '#888' }}>×</button>
                </div>

                {/* Scrollable content */}
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
                  {TOS_SECTIONS.map((s) => (
                    <section key={s.title}>
                      <h3 className="text-sm font-bold mb-1.5" style={{ color: '#3891A6' }}>{s.title}</h3>
                      <p className="text-xs leading-relaxed whitespace-pre-line" style={{ color: '#aaa' }}>{s.body}</p>
                    </section>
                  ))}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 shrink-0" style={{ borderTop: '1px solid rgba(56,145,166,0.3)' }}>
                  <button type="button" onClick={() => setShowTos(false)} className="px-4 py-2 rounded-lg text-sm font-medium transition hover:opacity-80" style={{ color: '#888' }}>
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() => { setTosAccepted(true); setShowTos(false); }}
                    className="px-6 py-2 rounded-lg text-sm font-semibold transition hover:opacity-90"
                    style={{ backgroundColor: '#3891A6', color: '#020202' }}
                  >
                    I Agree
                  </button>
                </div>
              </div>
            </div>
          )}

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
