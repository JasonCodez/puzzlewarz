"use client";

import { SessionProvider } from "next-auth/react";
import dynamic from "next/dynamic";
import { useEffect } from "react";

// socket.io-client is only used on client
let globalSocket: any = null;

const Navbar = dynamic(() => import("@/components/Navbar"), { ssr: false });

// TourLauncher removed — tutorial feature disabled

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // connect a global socket to receive notifications when user is logged in
    (async () => {
      try {
        const { io } = await import('socket.io-client');
        const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000', { transports: ['websocket'] });
        globalSocket = socket;

        socket.on('connect', async () => {
          try {
            // try to resolve current user id via API
            const res = await fetch('/api/user/info');
            if (res.ok) {
              const j = await res.json();
              const uid = j?.id;
              if (uid) {
                socket.emit('identify', { userId: uid });
              }
            }
          } catch (e) {
            // ignore
          }
        });

        socket.on('notification', (notif: any) => {
          try {
            window.dispatchEvent(new CustomEvent('notificationReceived', { detail: notif }));
          } catch (e) {
            // ignore
          }
        });
      } catch (e) {
        // ignore if socket client can't load
      }
    })();
    return () => {
      try { globalSocket?.disconnect(); } catch (e) {}
      globalSocket = null;
    };
  }, []);

  return (
    <SessionProvider>
      <Navbar />
      {children}
    </SessionProvider>
  );
}
