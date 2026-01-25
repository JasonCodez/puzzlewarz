import { create } from 'zustand';

interface AchievementModalState {
  notificationAchievement: any | null;
  setNotificationAchievement: (achievement: any | null) => void;
  shownAchievements: Set<string>;
  addShownAchievement: (id: string) => void;
}

export const useAchievementModalStore = create<AchievementModalState>((set, get) => ({
  notificationAchievement: null,
  setNotificationAchievement: (achievement) => set({ notificationAchievement: achievement }),
  shownAchievements: new Set(),
  addShownAchievement: (id) => {
    const prev = get().shownAchievements;
    set({ shownAchievements: new Set(prev).add(id) });
  },
}));
