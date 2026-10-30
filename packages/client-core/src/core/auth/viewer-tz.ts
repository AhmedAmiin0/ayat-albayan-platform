import { deviceTimeZone, resolveViewerTz } from '@ab/shared';

// The viewer's zone for both apps (docs/34 §2): the signed-in person's tz from GET /auth/me, else
// the device's, else the academy's. A store, like the clock preference, so code outside React
// reads it too and a sign-in re-renders the times on screen. Apps wrap it in useViewerTz().

const device = deviceTimeZone();
let person: string | null = null;
let current = resolveViewerTz({ person, device });
const listeners = new Set<() => void>();

/** The zone every displayed time reads in now. */
export function viewerTz(): string {
  return current;
}

/**
 * The zone the store reads for `person`'s tz, with the device zone it captured at start (not a fresh
 * deviceTimeZone(): a zone change on the phone must not make the two disagree forever).
 */
export function viewerTzFor(personTz: string | null | undefined): string {
  return resolveViewerTz({ person: personTz ?? null, device });
}

/** Sets the signed-in person's own tz (null on sign-out or when unset); notifies on a change. */
export function setViewerPersonTz(tz: string | null | undefined): void {
  person = tz ?? null;
  const next = viewerTzFor(person);
  if (next === current) return;
  current = next;
  listeners.forEach((listener) => listener());
}

/** useSyncExternalStore's subscribe. */
export function subscribeViewerTz(listener: () => void): () => void {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}
