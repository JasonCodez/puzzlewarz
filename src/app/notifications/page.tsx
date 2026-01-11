"use client";

import React from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import NotificationsPanel from "@/components/notifications/NotificationsPanel";

export default function NotificationsPage() {
  const router = useRouter();

  return (
    <div style={{ backgroundColor: '#020202' }} className="min-h-screen">
      <Navbar />
      <main className="pt-20 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-white mb-4">Notifications</h1>
          <p className="text-sm text-gray-400 mb-6">Your recent notifications are listed below.</p>
        </div>
        <NotificationsPanel isOpen={true} onClose={() => router.push('/dashboard')} />
      </main>
    </div>
  );
}
