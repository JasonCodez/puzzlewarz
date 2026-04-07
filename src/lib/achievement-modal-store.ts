import { create } from 'zustand';

interface AchievementModalState {
  achievementQueue: any[];
  enqueueAchievement: (achievement: any) => void;
  dequeueAchievement: () => void;
  shownAchievements: Set<string>;
  addShownAchievement: (id: string) => void;
  setShownAchievements: (ids: Iterable<string>) => void;
}

export const useAchievementModalStore = create<AchievementModalState>((set, get) => ({
  achievementQueue: [],
  enqueueAchievement: (achievement) => set({ achievementQueue: [...get().achievementQueue, achievement] }),
  dequeueAchievement: () => set({ achievementQueue: get().achievementQueue.slice(1) }),
  shownAchievements: new Set(),
  addShownAchievement: (id) => {
    const prev = get().shownAchievements;
    set({ shownAchievements: new Set(prev).add(id) });
  },
  setShownAchievements: (ids) => {
    set({ shownAchievements: new Set(ids) });
  },
}));
