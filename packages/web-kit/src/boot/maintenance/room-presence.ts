// The family web room is an overlay on document.body, not a route (docs/51): while one is mounted
// the cover stays away. A module store read with useSyncExternalStore, held through a ref callback
// (React 19 runs its cleanup on unmount), so no effect is needed.
let held = 0;
const listeners = new Set<() => void>();
const notify = (): void => {
  for (const listener of listeners) listener();
};

export function subscribeRoomPresence(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export const isRoomOpen = (): boolean => held > 0;

/** `ref={holdRoomOpen}` on a room overlay: counted while it is on screen. */
export function holdRoomOpen(): () => void {
  held += 1;
  notify();
  return () => {
    held -= 1;
    notify();
  };
}
