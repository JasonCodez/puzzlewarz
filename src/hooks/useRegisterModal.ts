"use client";

import { useEffect } from "react";
import { useModalQueueStore } from "@/lib/modal-queue-store";

/**
 * Register this modal in the global modal registry while it is mounted
 * (or while `active` is true for modals that control their own visibility).
 *
 * The GlobalAchievementModal will not show while any modal is registered.
 */
export function useRegisterModal(id: string, active = true) {
  const registerModal = useModalQueueStore((s) => s.registerModal);
  const unregisterModal = useModalQueueStore((s) => s.unregisterModal);

  useEffect(() => {
    if (!active) return;
    registerModal(id);
    return () => unregisterModal(id);
  }, [id, active, registerModal, unregisterModal]);
}
