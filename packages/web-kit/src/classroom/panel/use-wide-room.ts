import { useSyncExternalStore } from 'react';

/** Tailwind's `lg` (1024px): room enough for the stage and a 360px panel side by side. */
const WIDE = '(min-width: 64rem)';
const hasMedia = (): boolean => typeof matchMedia === 'function';

function subscribe(onChange: () => void): () => void {
  if (!hasMedia()) return () => undefined;
  const query = matchMedia(WIDE);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

const read = (): boolean => hasMedia() && matchMedia(WIDE).matches;

/**
 * True from `lg`: the room's chat and people sit in a panel beside the stage; below it they open
 * as a bottom sheet over the call (boards FamRoomWebLive vs FamRoomPhoneChat / FamRoomPhonePeople).
 */
export function useWideRoom(): boolean {
  return useSyncExternalStore(subscribe, read, () => false);
}
