
"use client";
import { SessionProvider } from "next-auth/react";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import AchievementNotification from "@/components/AchievementNotification";
import { rarityColors } from "@/lib/rarity";
import { useSession } from "next-auth/react";
import { useAchievementModalStore } from "@/lib/achievement-modal-store";
import TeamLobbyInviteModalProvider from "@/components/teams/TeamLobbyInviteModalProvider";

const Navbar = dynamic(() => import("@/components/Navbar"), { ssr: false });

let globalSocket: any = null;

function GlobalAchievementModal() {
  const { data: session } = useSession();
  const notificationAchievement = useAchievementModalStore((s) => s.notificationAchievement);
  const setNotificationAchievement = useAchievementModalStore((s) => s.setNotificationAchievement);
  const shownAchievements = useAchievementModalStore((s) => s.shownAchievements);
  const addShownAchievement = useAchievementModalStore((s) => s.addShownAchievement);
  const [collecting, setCollecting] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.user?.email) return;
    let interval: any;
    let mounted = true;
    const fetchAchievements = async () => {
      try {
        const response = await fetch("/api/user/achievements");
        if (response.ok) {
          const result = await response.json();
          result.achievements.forEach((achievement: any) => {
            const autoUnlockTypes = ["puzzles_solved", "submission_accuracy", "points_earned", "streak", "custom"];
            const canAutoCollect = autoUnlockTypes.includes(achievement.conditionType || "");
            const isReady = !achievement.unlocked && achievement.progressPercentage === 100 && canAutoCollect;
            if (isReady && !shownAchievements.has(achievement.id) && mounted) {
              setNotificationAchievement(achievement);
              addShownAchievement(achievement.id);
            }
          });
        }
      } catch (error) {
        // ignore
      }
    };
    fetchAchievements();
    interval = setInterval(fetchAchievements, 5000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [session?.user?.email, shownAchievements, setNotificationAchievement, addShownAchievement]);

  const collectAchievement = async (achievementId: string) => {
    setCollecting(achievementId);
    try {
      const response = await fetch("/api/user/achievements/collect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ achievementId }),
      });
      if (response.ok) {
        setTimeout(() => {
          setNotificationAchievement(null);
        }, 2000);
      }
    } catch (error) {
      // ignore
    } finally {
      setCollecting(null);
    }
  };

  if (!notificationAchievement) return null;
  return (
    <AchievementNotification
      achievement={notificationAchievement}
      rarityColors={rarityColors}
      isCollecting={collecting === notificationAchievement.id}
      onClose={() => setNotificationAchievement(null)}
      onCollect={() => collectAchievement(notificationAchievement.id)}
    />
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  // Ensure next-auth client always fetches from the current origin.
  // This avoids CLIENT_FETCH_ERROR when NEXTAUTH_URL is set to a different host
  // (e.g. production) or when accessing dev via a LAN IP.
  if (typeof window !== 'undefined') {
    const w = window as unknown as { __NEXTAUTH?: Record<string, unknown> };
    w.__NEXTAUTH = w.__NEXTAUTH || {};
    w.__NEXTAUTH.baseUrl = window.location.origin;
    w.__NEXTAUTH.basePath = (w.__NEXTAUTH.basePath as string) || '/api/auth';
  }

  useEffect(() => {
    // connect a global socket to receive notifications when user is logged in
    (async () => {
      try {
        const { io } = await import('socket.io-client');

        const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || (process.env.NODE_ENV !== 'production' ? 'http://localhost:4000' : '');
        if (!socketUrl) return;

        const socket = io(socketUrl, { transports: ['polling', 'websocket'] });
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
      <GlobalAchievementModal />
      <TeamLobbyInviteModalProvider />
      {children}
    </SessionProvider>
  );
}
