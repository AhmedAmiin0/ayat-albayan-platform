import { UNTAGGED } from './client-tag';
/** One counted request: the matched route template (never the raw URL) and the parsed client tag. */
export type UsageHit = { method: string; route: string; client: string };

const DEFAULT_MAX_ENTRIES = 500;
export const OTHER_BUCKET = 'other';

/**
 * In-memory hits per route × client × build (docs/26 §2f «Retiring an alias»). Beyond `max` distinct
 * keys a new key keeps its method, route and platform and only its build becomes 'other' (bounded by
 * routes × platforms), and 'untagged' keys are always kept: forged builds can never hide an old
 * client's hit on an alias route. Any 'other' count on a route means «not zero».
 */
export class ClientUsageCounter {
  private counts = new Map<string, number>();

  constructor(private readonly max: number = DEFAULT_MAX_ENTRIES) {}

  hit(h: UsageHit): void {
    const key = `${h.method} ${h.route} ${h.client}`;
    const keep = this.counts.has(key) || this.counts.size < this.max || h.client === UNTAGGED;
    const bucket = keep ? key : `${h.method} ${h.route} ${h.client.split('/')[0] ?? ''}/${OTHER_BUCKET}`;
    this.counts.set(bucket, (this.counts.get(bucket) ?? 0) + 1);
  }

  get size(): number {
    return this.counts.size;
  }

  /** The counts so far (largest first) and a reset. */
  drain(): [string, number][] {
    const out = [...this.counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    this.counts = new Map();
    return out;
  }
}

/** One log line: `n` per key, `; `-separated (empty → null: nothing to log). */
export function usageSummary(entries: readonly [string, number][]): string | null {
  if (entries.length === 0) return null;
  const total = entries.reduce((n, [, c]) => n + c, 0);
  return `client usage (${total} hits): ${entries.map(([k, c]) => `${k}=${c}`).join('; ')}`;
}
