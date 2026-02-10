"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";

export default function PlanningPage() {
  const params = useParams() as any;
  const teamId = params.id as string;
  const puzzleId = params.puzzleId as string;
  const router = useRouter();

  const [members, setMembers] = useState<any[]>([]);
  const [lobby, setLobby] = useState<any>(null);
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [assignmentsDirty, setAssignmentsDirty] = useState(false);
  const assignmentsDirtyRef = useRef(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const currentUserIdRef = useRef<string | null>(null);
  const [lobbyLeaderId, setLobbyLeaderId] = useState<string | null>(null);
  const navigatedRef = useRef(false);
  const socketRef = useRef<any>(null);
  const membersRef = useRef<any[]>([]);
  const roles = ["Scout", "Investigator", "Analyst", "Technician"];

  const isLeader = !!lobbyLeaderId && !!currentUserId && lobbyLeaderId === currentUserId;

  useEffect(() => {
    currentUserIdRef.current = currentUserId;
  }, [currentUserId]);

  useEffect(() => {
    membersRef.current = members || [];
  }, [members]);

  useEffect(() => {
    (async () => {
      await fetchCurrentUser();
      await fetchMembers();
      await ensureJoinedLobby();
      await fetchLobby();
    })();

    const t = setInterval(fetchLobby, 3000);

    // setup socket to receive live assignment updates
    (async () => {
      try {
        const { io } = await import('socket.io-client');

        const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || (process.env.NODE_ENV !== 'production' ? 'http://localhost:4000' : '');
        if (!socketUrl) return;

        const socket = io(socketUrl, { transports: ['polling', 'websocket'] });
        socketRef.current = socket;
        socket.on('connect', () => {
          // Join ASAP using refs to avoid false "leader left" during navigation.
          try {
            const uid = currentUserIdRef.current;
            if (!uid) return;
            const member = (membersRef.current || []).find((m: any) => m.user?.id === uid);
            const displayName = member?.user?.name || member?.user?.email || '';
            socket.emit('joinLobby', { teamId, puzzleId, userId: uid, name: displayName, isAdmin: false });
          } catch {
            // ignore
          }
        });
        socket.on('rolesAssigned', (payload: any) => {
          if (!payload) return;
          if (payload.assignments) {
            setAssignments(payload.assignments || {});
            setAssignmentsDirty(false);
            assignmentsDirtyRef.current = false;
          }
          // keep lobby in sync with finalized status
          if (typeof payload.assignmentsFinalized === 'boolean') {
            setLobby((prev: any) => ({ ...(prev || {}), assignmentsFinalized: payload.assignmentsFinalized, assignmentsFinalizedAt: payload.assignmentsFinalizedAt }));
          }
        });

        socket.on('puzzleOpened', (payload: any) => {
          try {
            if (!payload) return;
            if (payload.teamId !== teamId || payload.puzzleId !== puzzleId) return;
            router.push(`/puzzles/${puzzleId}?teamId=${encodeURIComponent(teamId)}`);
          } catch {
            // ignore
          }
        });
        socket.on('participantLeft', (payload: any) => {
          try {
            const name = payload?.userName || 'A teammate';
            // redirect back to lobby and show a notice
            const url = `/teams/${teamId}/lobby?puzzleId=${encodeURIComponent(puzzleId)}&notice=${encodeURIComponent(`${name} left the lobby`)}`;
            try { router.push(url); } catch (e) { window.location.href = url; }
          } catch (e) {
            // ignore
          }
        });
        socket.on('lobbyDestroyed', (payload: any) => {
          try {
            const reason = payload?.reason ? String(payload.reason) : '';
            if (reason === 'player_disconnected' || reason === 'missing_player' || reason === 'missing_player_navigation') {
              const notice =
                reason === 'missing_player'
                  ? 'A teammate did not join in time. The lobby was reset — please restart.'
                  : reason === 'missing_player_navigation'
                  ? 'A teammate did not reach the puzzle page in time. The lobby was reset — please restart.'
                  : 'A teammate disconnected. The lobby was reset — please restart.';
              const url = `/teams/${teamId}/lobby?puzzleId=${encodeURIComponent(puzzleId)}&notice=${encodeURIComponent(notice)}`;
              try { router.push(url); } catch (e) { window.location.href = url; }
              return;
            }

            // Leader shutdown (or other reasons): send everyone back to dashboard.
            const msg = 'The team leader shut down the lobby. You will be returned to the dashboard.';
            try { alert(msg); } catch (e) {}
            try { router.push('/dashboard'); } catch (e) { window.location.href = '/dashboard'; }
          } catch (e) {
            // ignore
          }
        });
      } catch (e) {
        // ignore socket errors
      }
    })();

    return () => {
      clearInterval(t);
      try { socketRef.current?.disconnect(); } catch (e) {}
    };
  }, [teamId, puzzleId]);

  // If a client missed the socket 'puzzleOpened' event (slow load / late join),
  // fall back to the polled lobby state.
  useEffect(() => {
    try {
      if (navigatedRef.current) return;
      if (!lobby?.puzzleOpenedAt) return;
      navigatedRef.current = true;
      router.push(`/puzzles/${puzzleId}?teamId=${encodeURIComponent(teamId)}`);
    } catch {
      // ignore
    }
  }, [lobby?.puzzleOpenedAt, router, puzzleId, teamId]);

  useEffect(() => {
    try {
      const member = members.find((m: any) => m.user?.id === currentUserId);
      if (socketRef.current && socketRef.current.connected) {
        try {
          const displayName = member?.user?.name || member?.user?.email || '';
          socketRef.current.emit('joinLobby', { teamId, puzzleId, userId: currentUserId || '', name: displayName, isAdmin: isLeader });
        } catch (e) {}
      }
    } catch (e) {}
  }, [members, currentUserId, lobbyLeaderId]);

  async function ensureJoinedLobby() {
    try {
      const res = await fetch('/api/team/lobby', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'join', teamId, puzzleId }),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        const msg = j?.error || 'Lobby not found';
        const url = `/teams/${teamId}/lobby?puzzleId=${encodeURIComponent(puzzleId)}&notice=${encodeURIComponent(msg)}`;
        try { router.push(url); } catch { window.location.href = url; }
      }
    } catch {
      // ignore
    }
  }

  async function fetchCurrentUser() {
    try {
      const res = await fetch('/api/user/info');
      if (!res.ok) return;
      const j = await res.json();
      setCurrentUserId(j.id || null);
    } catch (e) {}
  }

  async function fetchMembers() {
    try {
      const res = await fetch(`/api/teams/${teamId}`);
      if (!res.ok) return;
      const j = await res.json();
      setMembers(j.members || []);
    } catch (e) {
      // ignore
    }
  }

  async function fetchLobby() {
    try {
      const res = await fetch(`/api/team/lobby?teamId=${encodeURIComponent(teamId)}&puzzleId=${encodeURIComponent(puzzleId)}`);
      if (!res.ok) return;
      const j = await res.json();
      setLobby(j);
      setLobbyLeaderId(j?.leaderId || null);
      // Only update assignments from server if local edits are not in progress
      if (j && j.assignments && !assignmentsDirtyRef.current) setAssignments(j.assignments || {});
    } catch (e) {
      // ignore
    }
  }

  function setRoleFor(userId: string, role: string) {
    setAssignments((s) => ({ ...(s || {}), [userId]: role }));
    setAssignmentsDirty(true);
    assignmentsDirtyRef.current = true;
  }

  async function saveAssignments() {
    setSaving(true);
    try {
      const res = await fetch('/api/team/lobby', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'assignRoles', teamId, puzzleId, assignments }) });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        alert('Failed to save: ' + (j?.error || res.statusText));
        return;
      }
      await fetchLobby();
      setAssignmentsDirty(false);
      assignmentsDirtyRef.current = false;
      alert('Roles finalized');
    } catch (e) {
      alert('Failed to save roles');
    } finally {
      setSaving(false);
    }
  }

  async function openPuzzle() {
    try {
      const res = await fetch('/api/team/lobby', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'openPuzzle', teamId, puzzleId }),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        alert(j?.error || 'Failed to open puzzle');
        return;
      }

      // Navigate immediately for the leader; other participants will follow via socket 'puzzleOpened'.
      router.push(`/puzzles/${puzzleId}?teamId=${encodeURIComponent(teamId)}`);
    } catch (e) {
      alert('Failed to open puzzle');
    }
  }

  return (
    <div className="min-h-screen p-6" style={{ background: '#020202', paddingTop: 88 }}>
      <div className="max-w-3xl mx-auto bg-slate-900 border rounded-lg p-6">
        <h2 className="text-2xl text-white font-bold mb-4">Team Planning</h2>
        <p className="text-sm text-gray-300 mb-4">Assign specialties to each player before the escape room begins. Each role is unique; the team leader can change assignments any time before the run starts.</p>

        <div className="space-y-3">
          {(lobby?.participants || []).length === 0 && <div className="text-sm text-gray-400">No participants in the lobby yet.</div>}

          {members.filter((m: any) => (lobby?.participants || []).includes(m.user?.id)).map((m: any) => {
            const uid = m.user.id;
            const current = assignments?.[uid] || '';
            // compute roles taken by others
            const takenByOthers = new Set(Object.entries(assignments || {})
              .filter(([k, v]) => k !== uid && !!v)
              .map(([k, v]) => v));
            const availableRoles = roles.filter((r) => !takenByOthers.has(r) || r === current);
            const isLeader = !!lobbyLeaderId && !!currentUserId && lobbyLeaderId === currentUserId;
            return (
              <div key={uid} className="flex items-center justify-between p-3 bg-slate-800 rounded">
                <div className="text-white">{m.user.name || m.user.email}</div>
                <div className="flex items-center gap-2">
                  {isLeader ? (
                    <select value={current} onChange={(e) => setRoleFor(uid, e.target.value)} className="px-2 py-1 bg-black text-white border rounded">
                      <option value="">(unassigned)</option>
                      {availableRoles.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  ) : (
                    <div className="px-2 py-1 text-sm text-gray-300 bg-black border rounded">{current || '(unassigned)'}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex gap-2">
          {(() => {
            const participants = (lobby?.participants || []) as string[];
            const rolesFinalized = !!lobby?.assignmentsFinalized;
            const rolesComplete = participants.length === 4 && participants.every((uid) => !!assignments?.[uid]);
            const canOpen = isLeader && rolesFinalized && rolesComplete && !assignmentsDirty;

            if (!isLeader) return null;

            return (
              <>
                <button
                  onClick={openPuzzle}
                  disabled={!canOpen}
                  className={`px-4 py-2 rounded text-white ${canOpen ? 'bg-indigo-600' : 'bg-indigo-950 opacity-60 cursor-not-allowed'}`}
                  title={!canOpen ? 'Finalize roles for all 4 participants before opening the puzzle' : 'Open the puzzle for the team'}
                >
                  Open Puzzle
                </button>
                <button
                  disabled={saving || !rolesComplete}
                  onClick={saveAssignments}
                  className={`px-4 py-2 rounded text-white ${(!rolesComplete || saving) ? 'bg-emerald-950 opacity-60 cursor-not-allowed' : 'bg-emerald-600'}`}
                  title={!rolesComplete ? 'Assign a unique role to all 4 participants' : 'Finalize roles'}
                >
                  Finalize Roles
                </button>
              </>
            );
          })()}
          <button onClick={() => router.back()} className="px-4 py-2 bg-slate-700 text-white rounded">Back</button>
        </div>

        {!isLeader ? (
          <div className="mt-3 text-sm text-gray-400">
            Waiting for the lobby leader to finalize roles and open the puzzle.
          </div>
        ) : null}
      </div>
    </div>
  );
}
