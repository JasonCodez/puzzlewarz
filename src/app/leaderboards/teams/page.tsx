"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface TeamLeaderboardEntry {
  teamId: string;
  teamName: string;
  isPublic: boolean;
  bannerColor: string;
  totalPoints: number;
  totalPuzzlesSolved: number;
  memberCount: number;
  rank: number;
}

export default function TeamLeaderboards() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [entries, setEntries] = useState<TeamLeaderboardEntry[]>([]);
  const [userTeamRank, setUserTeamRank] = useState<TeamLeaderboardEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/auth/signin');
  }, [status, router]);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const response = await fetch("/api/leaderboards/teams", { cache: "no-store" });
        if (!response.ok) throw new Error("Failed to fetch team leaderboard");
        const data = await response.json();
        setEntries(data.entries);
        setUserTeamRank(data.userTeamRank);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  const getBannerBg = (bannerColor: string) => {
    if (bannerColor === "gold") return "rgba(253,231,76,0.07)";
    if (bannerColor === "crimson") return "rgba(220,38,38,0.09)";
    if (bannerColor === "neon") return "rgba(0,255,255,0.06)";
    return "transparent";
  };

  const getMedalEmoji = (rank: number) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return null;
  };

  const getRankColor = (rank: number) => {
    // All rows black background, no gradients or hover
    return "bg-black";
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-20" style={{ backgroundColor: '#000' }}>
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center py-12">
            <p style={{ color: '#FDE74C' }} className="text-lg">Loading team leaderboards...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen pt-20" style={{ backgroundColor: '#000' }}>
        <div className="container mx-auto px-4">
          <div className="border rounded-lg p-4 text-white" style={{ backgroundColor: '#111', borderColor: '#AB9F9D' }}>
            {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#000' }} className="min-h-screen">
      <div className="container mx-auto px-4 py-8 pt-28">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Team Leaderboards</h1>
          <p style={{ color: '#DDDBF1' }}>See how teams rank by points earned</p>
        </div>

        {/* Global Rankings Table */}
        <div className="bg-black rounded-lg overflow-hidden mb-8 border" style={{ borderColor: '#3891A6' }}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-black border-b" style={{ borderColor: '#3891A6' }}>
                  <th className="px-6 py-4 text-left text-sm font-semibold" style={{ color: '#3891A6' }}>
                    Rank
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold" style={{ color: '#3891A6' }}>
                    Team Name
                  </th>
                  <th className="px-6 py-4 text-right text-sm font-semibold" style={{ color: '#3891A6' }}>
                    Members
                  </th>
                  <th className="px-6 py-4 text-right text-sm font-semibold" style={{ color: '#3891A6' }}>
                    Puzzles Solved
                  </th>
                  <th className="px-6 py-4 text-right text-sm font-semibold" style={{ color: '#3891A6' }}>
                    Total Points
                  </th>
                </tr>
              </thead>
              <tbody>
                {entries.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center">
                      <div className="text-4xl mb-3">🏆</div>
                      <p className="font-semibold text-white mb-1">No teams yet</p>
                      <p className="text-sm" style={{ color: '#AB9F9D' }}>
                        Be the first to&nbsp;
                        <Link href="/teams" className="underline underline-offset-2 hover:opacity-80" style={{ color: '#3891A6' }}>
                          create a team
                        </Link>
                        &nbsp;and claim the top spot!
                      </p>
                    </td>
                  </tr>
                ) : (
                  entries.map((entry) => (
                  <tr
                    key={entry.teamId}
                    className={`transition-colors ${getRankColor(entry.rank)}`}
                    style={{ borderBottom: `1px solid rgba(56, 145, 166, 0.2)`, backgroundColor: getBannerBg(entry.bannerColor) }}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">
                          {getMedalEmoji(entry.rank) || `#${entry.rank}`}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {entry.isPublic ? (
                        <Link
                          href={`/teams/${entry.teamId}`}
                          className="font-semibold transition-colors hover:opacity-80"
                          style={{ color: '#DDDBF1' }}
                        >
                          {entry.teamName}
                        </Link>
                      ) : (
                        <span className="font-semibold flex items-center gap-1.5" style={{ color: '#DDDBF1' }}>
                          {entry.teamName}
                          <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: 'rgba(171,159,157,0.15)', color: '#AB9F9D' }}>Private</span>
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right" style={{ color: '#DDDBF1' }}>
                      {entry.memberCount}
                    </td>
                    <td className="px-6 py-4 text-right" style={{ color: '#DDDBF1' }}>
                      {entry.totalPuzzlesSolved}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-bold" style={{ color: '#FDE74C' }}>
                        {entry.totalPoints} pts
                      </span>
                    </td>
                  </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* User's Team Rank Card */}
        {userTeamRank && (
          <div className="rounded-lg p-6 border" style={{ backgroundColor: '#111', borderColor: '#3891A6' }}>
            <h2 className="text-lg font-semibold text-white mb-4">Your Team's Rank</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm" style={{ color: '#DDDBF1' }}>Team</p>
                <p className="text-xl font-bold text-white">{userTeamRank.teamName}</p>
              </div>
              <div>
                <p className="text-sm" style={{ color: '#DDDBF1' }}>Rank</p>
                <p className="text-3xl font-bold" style={{ color: '#3891A6' }}>
                  #{userTeamRank.rank}
                </p>
              </div>
              <div>
                <p className="text-sm" style={{ color: '#DDDBF1' }}>Points</p>
                <p className="text-2xl font-bold" style={{ color: '#FDE74C' }}>
                  {userTeamRank.totalPoints}
                </p>
              </div>
              <div>
                <p className="text-sm" style={{ color: '#DDDBF1' }}>Puzzles Solved</p>
                <p className="text-2xl font-bold" style={{ color: '#DDDBF1' }}>
                  {userTeamRank.totalPuzzlesSolved}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Leaderboards Link */}
        <div className="mt-8 text-center">
          <Link
            href="/leaderboards"
            className="transition-colors hover:opacity-80"
            style={{ color: '#3891A6' }}
          >
            ← Back to Global Leaderboards
          </Link>
        </div>
      </div>
    </div>
  );
}
