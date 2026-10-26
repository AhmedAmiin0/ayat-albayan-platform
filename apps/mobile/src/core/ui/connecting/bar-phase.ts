// The reconnecting bar's timing (WhatsApp's «جارٍ الاتصال…»): never for one slow request, a hint
// when it lasts, a short «تم الاتصال» on the way out.

export type BarPhase = 'hidden' | 'connecting' | 'check' | 'connected';

/** Connecting for less than this shows nothing (no flicker on a single failed request). */
export const BAR_DELAY_MS = 800;
/** Connecting for this long adds «تحقّق من اتصالك بالإنترنت». */
export const HINT_AFTER_MS = 10_000;
/** How long «تم الاتصال» stays before the bar slides away. */
export const CONNECTED_MS = 1500;

/** What the bar shows after `elapsed` ms of connecting. */
export function connectingPhase(elapsed: number): BarPhase {
  if (elapsed < BAR_DELAY_MS) return 'hidden';
  return elapsed < HINT_AFTER_MS ? 'connecting' : 'check';
}

/** Back online: «تم الاتصال» only if the bar was showing, else it never appears. */
export function onlinePhase(previous: BarPhase): BarPhase {
  return previous === 'hidden' ? 'hidden' : 'connected';
}
