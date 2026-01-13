"use client";

import React, { useEffect, useState } from "react";
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
  const roles = ["Navigator", "Solver", "Researcher", "Observer"];

  useEffect(() => {
    fetchMembers();
    fetchLobby();
    const t = setInterval(fetchLobby, 3000);
    return () => clearInterval(t);
  }, [teamId, puzzleId]);

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
      if (j && j.assignments) setAssignments(j.assignments || {});
    } catch (e) {
      // ignore
    }
  }

  function setRoleFor(userId: string, role: string) {
    setAssignments((s) => ({ ...(s || {}), [userId]: role }));
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
      alert('Roles saved');
    } catch (e) {
      alert('Failed to save roles');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen p-6" style={{ background: '#020202', paddingTop: 88 }}>
      <div className="max-w-3xl mx-auto bg-slate-900 border rounded-lg p-6">
        <h2 className="text-2xl text-white font-bold mb-4">Team Planning</h2>
        <p className="text-sm text-gray-300 mb-4">Assign roles to team participants before the puzzle starts. These assignments will be visible to the team.</p>

        <div className="space-y-3">
          {(lobby?.participants || []).length === 0 && <div className="text-sm text-gray-400">No participants in the lobby yet.</div>}

          {members.filter((m: any) => (lobby?.participants || []).includes(m.user?.id)).map((m: any) => {
            const uid = m.user.id;
            const current = assignments?.[uid] || '';
            return (
              <div key={uid} className="flex items-center justify-between p-3 bg-slate-800 rounded">
                <div className="text-white">{m.user.name || m.user.email}</div>
                <div className="flex items-center gap-2">
                  <select value={current} onChange={(e) => setRoleFor(uid, e.target.value)} className="px-2 py-1 bg-black text-white border rounded">
                    <option value="">(unassigned)</option>
                    {roles.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex gap-2">
          <button disabled={saving} onClick={saveAssignments} className="px-4 py-2 bg-emerald-600 text-white rounded">Save Roles</button>
          <button onClick={() => router.back()} className="px-4 py-2 bg-slate-700 text-white rounded">Back</button>
        </div>
      </div>
    </div>
  );
}
