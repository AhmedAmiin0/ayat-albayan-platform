// Bounded so a stream of distinct wrong keys cannot grow the map; the per-IP limit
// (relay.limit.ts) keeps that stream short, this caps what is left.
const MAX_KEYS = 1_000;

interface Verdict {
  ok: boolean;
  until: number;
}

/** A key's sha256 → accepted or refused, until an instant. */
export class KeyVerdicts {
  private readonly byKey = new Map<string, Verdict>();

  of(id: string, now: number): boolean | undefined {
    const v = this.byKey.get(id);
    return v !== undefined && v.until > now ? v.ok : undefined;
  }

  remember(id: string, verdict: Verdict): void {
    this.byKey.delete(id);
    const oldest = this.byKey.keys().next();
    if (this.byKey.size >= MAX_KEYS && !oldest.done) this.byKey.delete(oldest.value);
    this.byKey.set(id, verdict);
  }
}
