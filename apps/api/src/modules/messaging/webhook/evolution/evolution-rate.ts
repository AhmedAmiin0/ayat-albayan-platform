// A public route gets probed: each instance may deliver at most LIMIT webhooks a minute (Baileys
// history sync sends bursts, hence generous); an unknown instance shares one small bucket. In
// memory per API process; a 429 makes Evolution retry later, so nothing is lost.

const WINDOW_MS = 60_000;
const LIMIT = 1_200;
const UNKNOWN_LIMIT = 60;

interface Bucket {
  start: number;
  count: number;
}

export class EvolutionRate {
  private readonly buckets = new Map<string, Bucket>();

  /** true = this delivery may go on. `known`: the instance names one of our numbers. */
  take(key: string, at: { known: boolean; now: number }): boolean {
    const id = at.known ? key : '*unknown*';
    const limit = at.known ? LIMIT : UNKNOWN_LIMIT;
    const b = this.buckets.get(id);
    const fresh = !b || at.now - b.start >= WINDOW_MS;
    const next = fresh ? { start: at.now, count: 1 } : { start: b.start, count: b.count + 1 };
    this.buckets.set(id, next);
    return next.count <= limit;
  }
}
