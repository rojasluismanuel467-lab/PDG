import { useEffect, useRef } from "react";

/**
 * Debounced auto-save hook.
 *
 * Fires `onSave` after `delay` ms of inactivity whenever `hasChanges` is true.
 * Uses refs so the latest `onSave` / `hasChanges` values are always used at
 * fire time without resetting the debounce timer on every render.
 *
 * Designed to work alongside a manual save button — both paths call the same
 * `onSave` callback, so the parent's `isSaving` state drives the spinner.
 */
export function useAutoSave({
  state,
  hasChanges,
  onSave,
  delay = 2000,
  enabled = true,
}: {
  /** Any value derived from the editor state. A new reference restarts the timer. */
  state: unknown;
  hasChanges: boolean;
  onSave: () => Promise<void> | void;
  delay?: number;
  enabled?: boolean;
}): void {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSaveRef = useRef(onSave);
  const hasChangesRef = useRef(hasChanges);

  // Keep refs in sync without adding them to effect deps.
  onSaveRef.current = onSave;
  hasChangesRef.current = hasChanges;

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    // Only arm the timer when there are actual user changes.
    if (!enabled || !hasChanges) return;

    timerRef.current = setTimeout(() => {
      // Re-check at fire time: another save (manual or AI sync) may have
      // already reset hasChanges to false.
      if (hasChangesRef.current) {
        void onSaveRef.current();
      }
    }, delay);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // `state` is the only dep that drives the debounce restart on every edit.
    // `hasChanges` arms/disarms the timer; `delay` and `enabled` are config.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, hasChanges, delay, enabled]);
}
