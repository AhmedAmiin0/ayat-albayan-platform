import { useEffect, useSyncExternalStore } from 'react';

// Where the reconnecting bar goes: under the focused screen's header when it has one (ScreenHeader
// claims the slot while its screen is focused), else under the top safe area (app/_layout).

let claims = 0;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

/** A header takes the bar; the returned function gives it back. */
export function claimBarSlot(): () => void {
  claims += 1;
  notify();
  let released = false;
  return () => {
    if (released) return;
    released = true;
    claims -= 1;
    notify();
  };
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => void listeners.delete(listener);
};
const claimed = () => claims > 0;

/** True while a focused screen header shows the bar itself. */
export function useBarSlotClaimed(): boolean {
  return useSyncExternalStore(subscribe, claimed, claimed);
}

/** Claims the slot while `active` (a focused screen's header). */
export function useClaimBarSlot(active: boolean): void {
  useEffect(() => (active ? claimBarSlot() : undefined), [active]);
}
