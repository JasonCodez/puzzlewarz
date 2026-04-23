"use client";

import { useState, useEffect, useCallback } from "react";
import { formatFrequencyCanonicalGroupsInput } from "@/lib/frequency";

interface FrequencyQuestion {
  id: string;
  question: string;
  scheduledFor: string;
  status: string;
  canonicalGroups?: unknown;
  _count: { submissions: number; answers: number };
}

export default function AdminFrequencyPage() {
  const [questions, setQuestions] = useState<FrequencyQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [newQuestion, setNewQuestion] = useState("");
  const [newCanonicalGroupsText, setNewCanonicalGroupsText] = useState("");
  const [scheduledFor, setScheduledFor] = useState("");
  const [saving, setSaving] = useState(false);
  const [savingGroupsId, setSavingGroupsId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [confirmRevealId, setConfirmRevealId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [groupDrafts, setGroupDrafts] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const resp = await fetch("/api/admin/frequency");
    if (resp.status === 401) { setError("Access denied. Admin only."); setLoading(false); return; }
    const data = await resp.json();
    const nextQuestions = data.questions ?? [];
    setQuestions(nextQuestions);
    setGroupDrafts(
      Object.fromEntries(
        nextQuestions.map((question: FrequencyQuestion) => [question.id, formatFrequencyCanonicalGroupsInput(question.canonicalGroups)])
      )
    );
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!newQuestion.trim() || !scheduledFor) {
      setError("Question text and date are required.");
      return;
    }
    setSaving(true); setError(null);
    const resp = await fetch("/api/admin/frequency", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: newQuestion.trim(),
        scheduledFor,
        canonicalGroupsText: newCanonicalGroupsText,
      }),
    });
    const data = await resp.json();
    if (!resp.ok) { setError(data.error ?? "Failed to create"); setSaving(false); return; }
    setSuccessMsg("Question scheduled!");
    setNewQuestion(""); setNewCanonicalGroupsText(""); setScheduledFor("");
    setSaving(false);
    setTimeout(() => setSuccessMsg(null), 3000);
    load();
  };

  const saveCanonicalGroups = async (questionId: string) => {
    setSavingGroupsId(questionId);
    setError(null);

    const resp = await fetch("/api/admin/frequency", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId, canonicalGroupsText: groupDrafts[questionId] ?? "" }),
    });

    const data = await resp.json();
    if (!resp.ok) {
      setError(data.error ?? "Failed to save canonical groups");
      setSavingGroupsId(null);
      return;
    }

    setSuccessMsg(data.recalculated > 0
      ? `Canonical groups saved. Recalculated ${data.recalculated} submissions.`
      : "Canonical groups saved.");
    setSavingGroupsId(null);
    setTimeout(() => setSuccessMsg(null), 3000);
    load();
  };

  const confirmDelete = async () => {
    if (!confirmDeleteId) return;
    const questionId = confirmDeleteId;
    setConfirmDeleteId(null);
    const resp = await fetch(`/api/admin/frequency?questionId=${questionId}`, { method: "DELETE" });
    const data = await resp.json();
    if (!resp.ok) { setError(data.error ?? "Failed to delete"); return; }
    setSuccessMsg("Question deleted.");
    setTimeout(() => setSuccessMsg(null), 3000);
    load();
  };

  const confirmReveal = async () => {
    if (!confirmRevealId) return;
    const questionId = confirmRevealId;
    setConfirmRevealId(null);
    const resp = await fetch("/api/admin/frequency", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId }),
    });
    const data = await resp.json();
    if (!resp.ok) { setError(data.error ?? "Failed to reveal"); return; }
    setSuccessMsg(`Revealed! Recalculated ${data.recalculated} submissions.`);
    setTimeout(() => setSuccessMsg(null), 4000);
    load();
  };

  const today = new Date().toISOString().split("T")[0];

  return (
    <main className="min-h-screen pt-24 pb-10 px-4 bg-slate-900 text-white">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-black mb-2">📡 Frequency Admin</h1>
        <p className="text-sm text-slate-400 mb-8">Schedule questions, reveal results, merge answers.</p>

        {/* Schedule new question */}
        <div className="bg-slate-800 rounded-2xl p-5 mb-8 border border-slate-700">
          <h2 className="font-bold mb-4 text-slate-200">Schedule a New Question</h2>
          <div className="flex flex-col gap-3">
            <textarea
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              placeholder="e.g. Name something you'd find at a carnival"
              rows={2}
              className="w-full bg-slate-700 rounded-lg px-4 py-3 text-sm text-white placeholder-slate-500 outline-none border border-slate-600 focus:border-teal-500 resize-none"
            />
            <div className="flex gap-3 items-center">
              <input
                type="date"
                value={scheduledFor}
                min={today}
                onChange={(e) => setScheduledFor(e.target.value)}
                className="bg-slate-700 rounded-lg px-4 py-2 text-sm text-white outline-none border border-slate-600 focus:border-teal-500"
              />
              <button
                onClick={handleCreate}
                disabled={saving}
                className="px-5 py-2 rounded-lg text-sm font-bold bg-teal-600 hover:bg-teal-500 disabled:opacity-50 transition-colors"
              >
                {saving ? "Saving…" : "Schedule"}
              </button>
            </div>
            <textarea
              value={newCanonicalGroupsText}
              onChange={(e) => setNewCanonicalGroupsText(e.target.value)}
              placeholder={"Optional canonical groups\ntelevision: tv, tvs\nhamburger: burger, cheeseburger"}
              rows={4}
              className="w-full bg-slate-700 rounded-lg px-4 py-3 text-sm text-white placeholder-slate-500 outline-none border border-slate-600 focus:border-teal-500 resize-y"
            />
            <p className="text-xs text-slate-400">
              One group per line. Format: canonical answer, then aliases after a colon.
            </p>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            {successMsg && <p className="text-green-400 text-sm">{successMsg}</p>}
          </div>
        </div>

        {/* Questions list */}
        <h2 className="font-bold mb-3 text-slate-200">Questions</h2>
        {loading ? (
          <p className="text-slate-400 text-sm">Loading…</p>
        ) : questions.length === 0 ? (
          <p className="text-slate-400 text-sm">No questions yet.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {questions.map((q) => {
              const [year, month, day] = q.scheduledFor.slice(0, 10).split("-").map(Number);
              const dateStr = new Date(year, month - 1, day).toLocaleDateString("en-US", {
                weekday: "short", month: "short", day: "numeric",
              });
              return (
                <div key={q.id} className="bg-slate-800 rounded-xl p-4 border border-slate-700 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white truncate">{q.question}</p>
                    <div className="flex gap-3 mt-1 text-xs text-slate-400">
                      <span>📅 {dateStr}</span>
                      <span>💬 {q._count.submissions} submissions</span>
                      <span>🗂 {q._count.answers} answer groups</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className="text-xs font-semibold px-2 py-1 rounded-full"
                      style={{
                        background: q.status === "revealed" ? "rgba(34,197,94,0.15)" : "rgba(234,179,8,0.15)",
                        color: q.status === "revealed" ? "#4ade80" : "#fbbf24",
                      }}
                    >
                      {q.status}
                    </span>
                    {q.status === "pending" && (
                      <button
                        onClick={() => setConfirmRevealId(q.id)}
                        className="text-xs px-3 py-1.5 rounded-lg font-semibold bg-teal-700 hover:bg-teal-600 transition-colors"
                      >
                        Reveal ✓
                      </button>
                    )}
                    <button
                      onClick={() => setConfirmDeleteId(q.id)}
                      className="text-xs px-3 py-1.5 rounded-lg font-semibold bg-red-800 hover:bg-red-700 transition-colors"
                    >
                      Delete
                    </button>
                    <a
                      href={`/api/frequency/results/${q.id}`}
                      target="_blank"
                      className="text-xs px-3 py-1.5 rounded-lg font-semibold bg-slate-700 hover:bg-slate-600 transition-colors"
                    >
                      Results ↗
                    </a>
                  </div>
                  <div className="w-full border-t border-slate-700 pt-3 mt-1">
                    <p className="text-xs font-semibold text-slate-300 mb-2">Canonical groups</p>
                    <textarea
                      value={groupDrafts[q.id] ?? ""}
                      onChange={(e) => setGroupDrafts((prev) => ({ ...prev, [q.id]: e.target.value }))}
                      placeholder={"television: tv, tvs\nhamburger: burger, cheeseburger"}
                      rows={4}
                      className="w-full bg-slate-700 rounded-lg px-4 py-3 text-sm text-white placeholder-slate-500 outline-none border border-slate-600 focus:border-teal-500 resize-y"
                    />
                    <div className="mt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <p className="text-xs text-slate-400">
                        Save before reveal to merge wording like “tv” and “television” into one answer bucket.
                      </p>
                      <button
                        onClick={() => saveCanonicalGroups(q.id)}
                        disabled={savingGroupsId === q.id}
                        className="text-xs px-3 py-1.5 rounded-lg font-semibold bg-sky-700 hover:bg-sky-600 disabled:opacity-50 transition-colors"
                      >
                        {savingGroupsId === q.id ? "Saving…" : "Save groups"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete confirmation modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-800 border border-slate-600 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2">Delete this question?</h3>
            <p className="text-sm text-slate-400 mb-6">
              All submissions and answer groups will be permanently removed. This cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-slate-700 hover:bg-slate-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-red-700 hover:bg-red-600 transition-colors"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reveal confirmation modal */}
      {confirmRevealId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-800 border border-slate-600 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2">Reveal this question?</h3>
            <p className="text-sm text-slate-400 mb-6">
              This will lock in all current submissions and calculate final scores. This cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmRevealId(null)}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-slate-700 hover:bg-slate-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmReveal}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-teal-600 hover:bg-teal-500 transition-colors"
              >
                Yes, Reveal
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
