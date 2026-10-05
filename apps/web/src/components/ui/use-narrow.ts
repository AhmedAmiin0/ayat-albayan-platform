import { useCallback, useSyncExternalStore } from 'react';

const NARROW = '(max-width: 47.99rem)';
/** Tailwind's `max-sm`: below 640px, where forms open as full-screen sheets (owner, 2026-10-05). */
const PHONE = '(max-width: 39.99rem)';
const hasMedia = () => typeof matchMedia === 'function';

function useMedia(media: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (!hasMedia()) return () => undefined;
      const query = matchMedia(media);
      query.addEventListener('change', onChange);
      return () => query.removeEventListener('change', onChange);
    },
    [media],
  );
  return useSyncExternalStore(subscribe, () => hasMedia() && matchMedia(media).matches, () => false);
}

/** True under md (768px): phones, where a 7-column board gives way to a list per day. */
export function useNarrow(): boolean {
  return useMedia(NARROW);
}

/**
 * True under sm (640px), the Dialog's full-screen breakpoint: an inline form panel turns into an
 * opener button and the form moves into a Dialog. From 640px on, the page stays as it is.
 */
export function usePhone(): boolean {
  return useMedia(PHONE);
}
