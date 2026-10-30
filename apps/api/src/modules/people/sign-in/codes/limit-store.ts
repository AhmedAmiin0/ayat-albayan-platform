import { WindowCounter } from '../../../teaching/feedback';

/** One bucket of a limit: its key (kind + who) and how many hits the window allows. */
export interface LimitBucket {
  key: string;
  max: number;
}

export interface LimitTake {
  buckets: readonly LimitBucket[];
  windowMs: number;
  /** ms since the epoch; the database store uses its own clock (one clock for every API copy). */
  now: number;
}

/**
 * Where the sign-in buckets are counted. Sliding window, in order: the first full bucket answers false and
 * the later ones are not hit (as `a && b` over WindowCounter did).
 */
export interface LimitStore {
  take(input: LimitTake): Promise<boolean>;
}

export const LIMIT_STORE = Symbol('LIMIT_STORE');

/** One process's buckets (tests, sign-in.world, and the database store's fallback). */
export class MemoryLimitStore implements LimitStore {
  /** One counter per max: the keys carry the kind, so buckets never mix. */
  private readonly counters = new Map<number, WindowCounter>();

  take(input: LimitTake): Promise<boolean> {
    return Promise.resolve(
      input.buckets.every((b) => this.counter(b.max).allow(b.key, input.now, input.windowMs)),
    );
  }

  private counter(max: number): WindowCounter {
    const found = this.counters.get(max);
    if (found) return found;
    const made = new WindowCounter(max);
    this.counters.set(max, made);
    return made;
  }
}
