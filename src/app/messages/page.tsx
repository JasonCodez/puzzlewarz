"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import ConfirmModal from '@/components/ConfirmModal';
import ActionModal from '@/components/ActionModal';

type Thread = {
  userId: string;
  userName: string | null;
  userImage: string | null;
  lastMessage: string;
  lastAt: string;
  unreadCount: number;
};

export default function MessagesPage() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeThread, setActiveThread] = useState<string | null>(null);

  const fetchThreads = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/user/inbox');
      if (res.ok) {
        const j = await res.json();
        setThreads(j.threads || []);
      }
    } catch (e) {
      console.error('Failed to load inbox', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchThreads(); }, []);

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#020202' }}>
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">Inbox</h1>
          <Link href="/dashboard" className="text-sm text-sky-400">Back</Link>
        </div>

        {loading ? (
          <div className="text-white">Loading...</div>
        ) : threads.length === 0 ? (
          <div className="text-white">No conversations yet.</div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {threads.map((t) => (
              <button
                key={t.userId}
                onClick={() => setActiveThread(t.userId)}
                className="flex items-center justify-between p-3 rounded bg-slate-800 hover:opacity-90"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-600 overflow-hidden">
                    {t.userImage ? <img src={t.userImage} alt={t.userName || 'User'} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-white">👤</div>}
                  </div>
                  <div className="text-left">
                    <div className="text-white font-semibold">{t.userName || t.userId}</div>
                    <div className="text-sm text-gray-300 truncate" style={{ maxWidth: 420 }}>{t.lastMessage}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-400">{new Date(t.lastAt).toLocaleString()}</div>
                  {t.unreadCount > 0 && <div className="mt-1 inline-block px-2 py-1 bg-red-600 text-white text-xs rounded">{t.unreadCount}</div>}
                </div>
              </button>
            ))}
          </div>
        )}

        {activeThread && (
          <div className="mt-6">
            <ConversationPanel
              userId={activeThread}
              onClose={() => setActiveThread(null)}
              onDeleted={() => { setActiveThread(null); fetchThreads(); }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function ConversationPanel({ userId, onClose, onDeleted }: { userId: string; onClose: () => void; onDeleted?: () => void }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchConv = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/users/${userId}/messages`);
      if (res.ok) {
        const j = await res.json();
        setMessages(j || []);
      }
    } catch (e) {
      console.error('Failed to fetch conversation', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchConv(); }, [userId]);

  const send = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!text.trim()) return;
    try {
      const res = await fetch(`/api/users/${userId}/messages`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: text.trim() }) });
      if (res.ok) {
        setText('');
        await fetchConv();
      }
    } catch (err) { console.error(err); }
  };

  return (
    <div className="border rounded p-4 bg-slate-900">
      <div className="flex justify-between items-center mb-3">
        <div className="text-white font-semibold">Conversation</div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowConfirm(true)} className="text-sm text-red-400">Delete history</button>
          <button onClick={onClose} className="text-sm text-gray-300">Close</button>
        </div>
      </div>

      {loading ? <div className="text-white">Loading...</div> : (
        <div className="space-y-2 max-h-64 overflow-y-auto mb-3">
          {messages.map((m: any) => (
            <div key={m.id} className={`p-2 rounded ${m.senderId === m.sender?.id ? 'bg-slate-700' : 'bg-slate-800'}`}>
              <div className="text-sm text-gray-300">{m.sender?.name || m.senderId}</div>
              <div className="text-white">{m.content}</div>
              <div className="text-xs text-gray-400">{new Date(m.createdAt).toLocaleString()}</div>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={send} className="flex gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)} className="flex-1 px-3 py-2 rounded bg-black text-white border" placeholder="Write a message..." />
        <button type="submit" className="px-4 py-2 rounded bg-sky-500 text-white">Send</button>
      </form>
      <ConfirmModal
        isOpen={showConfirm}
        title="Delete conversation"
        message="Delete conversation history? This cannot be undone."
        confirmLabel={deleting ? 'Deleting...' : 'Delete'}
        cancelLabel="Cancel"
        onConfirm={async () => {
          setDeleting(true);
          try {
            const res = await fetch(`/api/users/${userId}/messages`, { method: 'DELETE' });
            if (res.ok) {
              setShowConfirm(false);
              setShowSuccess(true);
              onDeleted?.();
            } else {
              const j = await res.json().catch(() => ({}));
              alert('Failed to delete conversation: ' + (j?.error || res.statusText));
            }
          } catch (err) {
            console.error(err);
            alert('Failed to delete conversation');
          } finally {
            setDeleting(false);
          }
        }}
        onCancel={() => setShowConfirm(false)}
      />

      <ActionModal
        isOpen={showSuccess}
        variant="success"
        title="Conversation deleted"
        message="The conversation history was deleted successfully."
        onClose={() => setShowSuccess(false)}
      />
    </div>
  );
}
