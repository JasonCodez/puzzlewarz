"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import LoadingSpinner from "@/components/LoadingSpinner";

type LobbyMember = {
  userId: string;
  user: { id: string; name?: string | null; email?: string | null; image?: string | null };
};

type LobbyState = {
  id: string;
  code: string;
  puzzleId: string;
  hostId: string;
  maxPlayers: number;
  status: string;
  expiresAt: string;
  startedAt?: string | null;
  members: LobbyMember[];
};

type ViewMode = "pick" | "waiting" | "join-input";

type SoloSave = {
  pausedAt: string;
  pausedRemainingMs: number | null;
  currentStageIndex: number;
};

export default function EscapeRoomLobbyPage() {
  const { data: session, status: sessionStatus } = useSession();
  const params = useParams();
  const router = useRouter();
  const puzzleId = params.id as string;

  const [view, setView] = useState<ViewMode>("pick");
  const [lobby, setLobby] = useState<LobbyState | null>(null);
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);
  const [maxPlayers, setMaxPlayers] = useState(2);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [puzzleTitle, setPuzzleTitle] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [soloSave, setSoloSave] = useState<SoloSave | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load puzzle title
  useEffect(() => {
    if (!puzzleId) return;
    fetch(`/api/puzzles/${puzzleId}/info`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => j?.title && setPuzzleTitle(String(j.title)))
      .catch(() => {});
  }, [puzzleId]);

  // Check for a paused solo save
  useEffect(() => {
    if (!puzzleId || sessionStatus !== "authenticated") return;
    fetch(`/api/escape-rooms/${puzzleId}/solo-save`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setSoloSave(j?.save ?? null))
      .catch(() => {});
  }, [puzzleId, sessionStatus]);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const fetchLobby = useCallback(async (code: string) => {
    try {
      const res = await fetch(`/api/escape-rooms/${puzzleId}/lobby/${code}`);
      if (!res.ok) return null;
      return (await res.json()) as LobbyState;
    } catch {
      return null;
    }
  }, [puzzleId]);

  // Poll when in waiting room
  useEffect(() => {
    if (view !== "waiting" || !lobby) return;

    const tick = async () => {
      const updated = await fetchLobby(lobby.code);
      if (!updated) return;
      setLobby(updated);
      if (updated.status === "started") {
        stopPolling();
        router.push(`/puzzles/${puzzleId}?lobbyId=${encodeURIComponent(updated.id)}`);
      } else if (updated.status === "expired") {
        stopPolling();
        setError("The lobby has expired.");
        setView("pick");
        setLobby(null);
      }
    };

    pollRef.current = setInterval(tick, 3000);
    return stopPolling;
  }, [view, lobby, puzzleId, fetchLobby, stopPolling, router]);

  if (sessionStatus === "loading") {
    return <LoadingSpinner size={180} />;
  }
  if (!session?.user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-gray-400">
        Please <Link href="/auth/signin" className="text-amber-400 underline mx-1">sign in</Link> to access the lobby.
      </div>
    );
  }

  const currentUserId = (session.user as any)?.id as string | undefined;
  const isHost = lobby ? lobby.hostId === currentUserId : false;

  const handleSolo = async (discardSave = false) => {
    setLoading(true);
    setError(null);
    try {
      // If user wants a fresh start, discard the paused save first.
      if (discardSave && soloSave) {
        await fetch(`/api/escape-rooms/${puzzleId}/solo-save`, { method: "DELETE" });
        setSoloSave(null);
      }
      const res = await fetch(`/api/escape-rooms/${puzzleId}/lobby`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maxPlayers: 1 }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j?.error || "Failed to create lobby");
        return;
      }
      const j = await res.json();
      const lobbyData = j.lobby as LobbyState;
      // Auto-start for solo
      const startRes = await fetch(`/api/escape-rooms/${puzzleId}/lobby/${lobbyData.code}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!startRes.ok) {
        const sj = await startRes.json().catch(() => ({}));
        setError(sj?.error || "Failed to start solo run");
        return;
      }
      router.push(`/puzzles/${puzzleId}?lobbyId=${encodeURIComponent(lobbyData.id)}`);
    } catch (e: any) {
      setError(e?.message || "Error");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLobby = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/escape-rooms/${puzzleId}/lobby`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maxPlayers }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j?.error || "Failed to create lobby");
        return;
      }
      const j = await res.json();
      // Fetch full lobby state (with members)
      const lobbyData = await fetchLobby(j.lobby.code);
      if (!lobbyData) {
        setError("Could not load lobby state");
        return;
      }
      setLobby(lobbyData);
      setView("waiting");
    } catch (e: any) {
      setError(e?.message || "Error");
    } finally {
      setLoading(false);
    }
  };

  const handleJoinLobby = async () => {
    if (!joinCode.trim()) return;
    setLoading(true);
    setJoinError(null);
    try {
      const code = joinCode.trim().toUpperCase();
      const res = await fetch(`/api/escape-rooms/${puzzleId}/lobby/${code}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setJoinError(j?.error || "Failed to join lobby");
        return;
      }
      const lobbyData = await fetchLobby(code);
      if (!lobbyData) {
        setJoinError("Could not load lobby state");
        return;
      }
      setLobby(lobbyData);
      setView("waiting");
    } catch (e: any) {
      setJoinError(e?.message || "Error");
    } finally {
      setLoading(false);
    }
  };

  const handleStartGame = async () => {
    if (!lobby) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/escape-rooms/${puzzleId}/lobby/${lobby.code}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j?.error || "Failed to start game");
        return;
      }
      stopPolling();
      router.push(`/puzzles/${puzzleId}?lobbyId=${encodeURIComponent(lobby.id)}`);
    } catch (e: any) {
      setError(e?.message || "Error");
    } finally {
      setLoading(false);
    }
  };

  const handleLeave = async () => {
    if (!lobby) return;
    setLoading(true);
    try {
      await fetch(`/api/escape-rooms/${puzzleId}/lobby/${lobby.code}/leave`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
    } catch {}
    stopPolling();
    setLobby(null);
    setView("pick");
    setLoading(false);
  };

  const handleCopyCode = async () => {
    if (!lobby) return;
    try {
      await navigator.clipboard.writeText(lobby.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const expiresIn = lobby
    ? Math.max(0, Math.floor((new Date(lobby.expiresAt).getTime() - Date.now()) / 60000))
    : 0;

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-start py-12 px-4">
      <div className="w-full max-w-lg">
        <div className="mb-6">
          <Link href={`/escape-rooms/${puzzleId}`} className="text-amber-400 hover:text-amber-300 text-sm">
            ← Back to Escape Room
          </Link>
          {puzzleTitle && (
            <h1 className="text-2xl font-bold mt-2 text-white">{puzzleTitle}</h1>
          )}
          <p className="text-gray-400 text-sm mt-1">Escape Room Lobby</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded border border-red-500/40 bg-red-500/10 text-red-300 text-sm">{error}</div>
        )}

        {/* PICK MODE */}
        {view === "pick" && (
          <div className="space-y-4">
            <p className="text-gray-300 text-sm">Play solo or team up with up to 4 players.</p>

            {/* Solo */}
            {soloSave ? (
              <div className="p-4 rounded-lg border border-amber-700/50 bg-amber-900/10 space-y-3">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">⏸</span>
                  <div>
                    <p className="font-semibold text-amber-300">You have a saved game</p>
                    <p className="text-xs text-amber-200/60 mt-0.5">
                      Stage {soloSave.currentStageIndex} · paused {new Date(soloSave.pausedAt).toLocaleDateString()}
                      {soloSave.pausedRemainingMs !== null
                        ? ` · ${Math.floor(soloSave.pausedRemainingMs / 60000)}m remaining`
                        : ""}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSolo(false)}
                    disabled={loading}
                    className="flex-1 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold text-sm transition disabled:opacity-50"
                  >
                    {loading ? "Loading…" : "Resume Game"}
                  </button>
                  <button
                    onClick={() => handleSolo(true)}
                    disabled={loading}
                    className="flex-1 py-2.5 rounded-lg border border-gray-600 bg-neutral-800 hover:bg-neutral-700 text-gray-300 text-sm transition disabled:opacity-50"
                  >
                    Start Fresh
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => handleSolo(false)}
                disabled={loading}
                className="w-full py-4 rounded-lg border border-amber-700/50 bg-amber-900/20 hover:bg-amber-800/30 text-amber-300 font-semibold text-lg transition disabled:opacity-50"
              >
                🔦 Play Solo
              </button>
            )}

            {/* Create Lobby */}
            <div className="p-4 rounded-lg border border-gray-700 bg-neutral-900/60 space-y-3">
              <h2 className="font-semibold text-white">Create a Lobby</h2>
              <div className="flex items-center gap-3">
                <label className="text-sm text-gray-400 w-28">Max Players</label>
                <div className="flex gap-2">
                  {[2, 3, 4].map((n) => (
                    <button
                      key={n}
                      onClick={() => setMaxPlayers(n)}
                      className={`w-9 h-9 rounded border font-bold text-sm transition ${
                        maxPlayers === n
                          ? "border-amber-500 bg-amber-700/40 text-amber-200"
                          : "border-gray-600 bg-neutral-800 text-gray-300 hover:border-gray-500"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={handleCreateLobby}
                disabled={loading}
                className="w-full py-3 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold transition disabled:opacity-50"
              >
                Create Lobby
              </button>
            </div>

            {/* Join Lobby */}
            <button
              onClick={() => { setView("join-input"); setJoinError(null); }}
              className="w-full py-3 rounded-lg border border-gray-600 bg-neutral-900/60 hover:bg-neutral-800/60 text-gray-300 font-medium transition"
            >
              Enter Lobby Code
            </button>
          </div>
        )}

        {/* JOIN INPUT */}
        {view === "join-input" && (
          <div className="space-y-4">
            <button
              onClick={() => { setView("pick"); setJoinCode(""); setJoinError(null); }}
              className="text-sm text-gray-400 hover:text-gray-200"
            >
              ← Back
            </button>
            <h2 className="font-semibold text-white text-lg">Join a Lobby</h2>
            {joinError && (
              <div className="p-3 rounded border border-red-500/40 bg-red-500/10 text-red-300 text-sm">{joinError}</div>
            )}
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))}
              placeholder="6-character code"
              className="w-full px-4 py-3 rounded-lg bg-neutral-800 border border-gray-600 text-white text-center text-xl tracking-widest font-mono focus:outline-none focus:border-amber-500"
              maxLength={6}
              onKeyDown={(e) => e.key === "Enter" && joinCode.length === 6 && handleJoinLobby()}
            />
            <button
              onClick={handleJoinLobby}
              disabled={loading || joinCode.length !== 6}
              className="w-full py-3 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold transition disabled:opacity-50"
            >
              {loading ? "Joining…" : "Join Lobby"}
            </button>
          </div>
        )}

        {/* WAITING ROOM */}
        {view === "waiting" && lobby && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-white text-xl">Waiting Room</h2>
              <span className="text-xs text-gray-500">Expires in ~{expiresIn}m</span>
            </div>

            {/* Lobby code */}
            <div className="p-4 rounded-lg border border-amber-700/50 bg-amber-900/10 text-center space-y-2">
              <p className="text-sm text-gray-400">Share this code with friends</p>
              <div className="text-4xl font-mono font-bold tracking-[0.35em] text-amber-300">
                {lobby.code}
              </div>
              <button
                onClick={handleCopyCode}
                className="text-xs text-amber-400 hover:text-amber-300 underline"
              >
                {copied ? "Copied!" : "Copy code"}
              </button>
            </div>

            {/* Members */}
            <div className="space-y-2">
              <p className="text-sm text-gray-400">
                Players ({lobby.members.length}/{lobby.maxPlayers})
              </p>
              {lobby.members.map((m) => (
                <div
                  key={m.userId}
                  className="flex items-center gap-3 p-3 rounded-lg bg-neutral-800/60 border border-gray-700"
                >
                  {m.user.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.user.image} alt="" className="w-8 h-8 rounded-full" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-amber-700/40 flex items-center justify-center text-amber-300 font-bold text-sm">
                      {(m.user.name || m.user.email || "?")[0].toUpperCase()}
                    </div>
                  )}
                  <span className="text-white text-sm">
                    {m.user.name || m.user.email || "Player"}
                  </span>
                  {lobby.hostId === m.userId && (
                    <span className="ml-auto text-xs text-amber-400 font-medium">Host</span>
                  )}
                </div>
              ))}
            </div>

            {isHost ? (
              <button
                onClick={handleStartGame}
                disabled={loading}
                className="w-full py-3 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold transition disabled:opacity-50"
              >
                {loading ? "Starting…" : "Start Game"}
              </button>
            ) : (
              <p className="text-center text-gray-400 text-sm">Waiting for the host to start…</p>
            )}

            <button
              onClick={handleLeave}
              disabled={loading}
              className="w-full py-2 rounded-lg border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 text-sm transition disabled:opacity-50"
            >
              Leave Lobby
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
