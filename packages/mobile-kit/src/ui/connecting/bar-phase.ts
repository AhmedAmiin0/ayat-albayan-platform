// Never for one slow request, a hint when it lasts, a short connected state on the way out.

export type BarPhase = 'hidden' | 'connecting' | 'check' | 'connected';

/** Connecting for less than this shows nothing (no flicker on a single failed request). */
export const BAR_DELAY_MS = 800;
/** Connecting this long adds the check-your-connection hint. */
export const HINT_AFTER_MS = 10_000;
export const CONNECTED_MS = 1500;

/** What the bar shows after `elapsed` ms of connecting. */
export function connectingPhase(elapsed: number): BarPhase {
  if (elapsed < BAR_DELAY_MS) return 'hidden';
  return elapsed < HINT_AFTER_MS ? 'connecting' : 'check';
}

/** Back online shows connected only if the bar was showing. */
export function onlinePhase(previous: BarPhase): BarPhase {
  return previous === 'hidden' ? 'hidden' : 'connected';
}
