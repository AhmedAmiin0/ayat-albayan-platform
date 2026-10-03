import { useSyncExternalStore } from 'react';

const NARROW = '(max-width: 47.99rem)';
const hasMedia = () => typeof matchMedia === 'function';

function subscribe(onChange: () => void): () => void {
  if (!hasMedia()) return () => undefined;
  const query = matchMedia(NARROW);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

/** True under md (768px): phones, where a 7-column board gives way to a list per day. */
export function useNarrow(): boolean {
  return useSyncExternalStore(subscribe, () => hasMedia() && matchMedia(NARROW).matches, () => false);
}
