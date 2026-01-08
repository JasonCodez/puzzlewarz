"use client";

import React, { useState, useEffect, useRef } from "react";
import { Mail } from "lucide-react";
import { useRouter } from "next/navigation";

export default function MessagesBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => {
      clearInterval(interval);
      abortRef.current?.abort();
      abortRef.current = null;
    };
  }, []);

  const fetchUnreadCount = async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await fetch('/api/user/inbox', { signal: controller.signal });
      if (!res.ok) {
        setUnreadCount(0);
        return;
      }
      const data = await res.json();
      const threads = Array.isArray(data?.threads) ? data.threads : [];
      const totalUnread = threads.reduce((sum: number, t: any) => sum + (t.unreadCount || 0), 0);
      setUnreadCount(totalUnread);
    } catch (err) {
      if ((err as any)?.name === 'AbortError') return;
      console.warn('Failed to fetch inbox unread count', err);
      setUnreadCount(0);
    }
  };

  return (
    <button
      onClick={() => router.push('/messages')}
      className="relative p-2 hover:bg-slate-800 rounded-lg transition-colors group"
      title="Messages"
    >
      <Mail className="w-5 h-5 text-gray-400 group-hover:text-white" />
      {unreadCount > 0 && (
        <span className="absolute top-1 right-1 w-4 h-4 bg-red-600 text-white text-xs rounded-full flex items-center justify-center font-bold">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </button>
  );
}
