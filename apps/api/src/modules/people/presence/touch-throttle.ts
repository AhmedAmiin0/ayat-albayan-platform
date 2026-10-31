/** At most one last-seen write per user per minute (docs/33 §1.2). */
export const TOUCH_EVERY_MS = 60_000;

/** Users remembered; beyond it the oldest is forgotten (it may write once more: no harm). */
const TOUCH_MAX_USERS = 10_000;

/** Is a write due: never written, or the last is TOUCH_EVERY_MS old (a clock going back: no). */
export function shouldTouch(lastMs: number | undefined, nowMs: number): boolean {
  return lastMs === undefined || nowMs - lastMs >= TOUCH_EVERY_MS;
}

/** The in-memory side of the throttle: per process, bounded, oldest dropped first. */
export class TouchThrottle {
  private readonly last = new Map<string, number>();

  constructor(private readonly max: number = TOUCH_MAX_USERS) {}

  /** true (and remembered) when this user's write is due now. */
  take(userId: string, nowMs: number): boolean {
    if (!shouldTouch(this.last.get(userId), nowMs)) return false;
    this.last.delete(userId);
    this.last.set(userId, nowMs);
    if (this.last.size > this.max) {
      const oldest = this.last.keys().next();
      if (!oldest.done) this.last.delete(oldest.value);
    }
    return true;
  }

  get size(): number {
    return this.last.size;
  }
}
