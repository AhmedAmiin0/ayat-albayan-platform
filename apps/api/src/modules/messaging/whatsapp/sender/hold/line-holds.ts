import { PAYMENT_HOLD_MAX_MS, PAYMENT_HOLD_MIN_MS } from './payment-hold';

interface Held {
  /** The hold end (epoch ms). */
  until: number;
  /** This hold's length: the next renewal doubles it (≤ 6 h). */
  ms: number;
}

/** A line hold set or renewed by a probe's 131042. */
interface HoldSet {
  until: number;
  /** The previous hold's end in this episode (its deferred rows move to the new end); else null. */
  prev: number | null;
  /** false = the line was already held: nothing renewed. */
  fresh: boolean;
}

/**
 * The line holds' state, in memory (a restart costs one extra probe). Sized from the line's own
 * history, never from the probe row's age: 30 min, then doubled at each renewal up to 6 h while
 * the line stays held. An episode ends when a row of the line is sent (lift) or when no probe came
 * within 6 h of the last hold end (the next 131042 starts at 30 min again).
 */
export class LineHolds {
  private readonly held = new Map<string, Held>();

  hold(key: string, now: Date): HoldSet {
    const t = now.getTime();
    const was = this.held.get(key);
    if (was && was.until > t) return { until: was.until, prev: null, fresh: false };
    const going = was !== undefined && t - was.until <= PAYMENT_HOLD_MAX_MS;
    const ms = going ? Math.min(PAYMENT_HOLD_MAX_MS, was.ms * 2) : PAYMENT_HOLD_MIN_MS;
    this.held.set(key, { until: t + ms, ms });
    return { until: t + ms, prev: going ? was.until : null, fresh: true };
  }

  /** The hold end while the line is held, else null (the history is kept for the next renewal). */
  heldUntil(key: string, now: Date): number | null {
    const at = this.held.get(key)?.until;
    return at !== undefined && at > now.getTime() ? at : null;
  }

  /** A row of the line was sent: the episode is over. Returns the end it had, if any. */
  lift(key: string): number | null {
    const at = this.held.get(key)?.until ?? null;
    this.held.delete(key);
    return at;
  }
}
