import { create } from "zustand";

/**
 * Global modal registry.
 * Any modal that needs to "block" the GlobalAchievementModal from firing on
 * top of it should call registerModal(id) on mount and unregisterModal(id)
 * on unmount (or when it becomes invisible).
 *
 * The GlobalAchievementModal checks openModals.size before rendering.
 */

interface ModalQueueStore {
  openModals: Set<string>;
  registerModal: (id: string) => void;
  unregisterModal: (id: string) => void;
}

export const useModalQueueStore = create<ModalQueueStore>()((set) => ({
  openModals: new Set<string>(),
  registerModal: (id) =>
    set((s) => ({ openModals: new Set([...s.openModals, id]) })),
  unregisterModal: (id) =>
    set((s) => {
      const next = new Set(s.openModals);
      next.delete(id);
      return { openModals: next };
    }),
}));
