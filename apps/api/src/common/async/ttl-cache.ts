/**
 * One value loaded at most once per `ttlMs` (SettingsService's pattern, docs/26 §2c): concurrent
 * callers share the one promise; a failed load is never cached, so the next call asks again. clear()
 * after this API's own write; another writer is seen within the TTL. ttlMs 0 = no caching (e2e).
 * `ttlMs` may be a function, read on every call (a property-injected period). Holds whatever the
 * loader returns in memory only: never log a secret it carries.
 */
export class TtlCache<T> {
  private entry: { at: number; value: Promise<T> } | null = null;

  constructor(
    private readonly ttlMs: number | (() => number),
    private readonly load: () => Promise<T>,
  ) {}

  get(now = Date.now()): Promise<T> {
    const ttl = typeof this.ttlMs === 'number' ? this.ttlMs : this.ttlMs();
    if (this.entry && now - this.entry.at < ttl) return this.entry.value;
    const entry = { at: now, value: this.load() };
    this.entry = entry;
    entry.value.catch(() => {
      if (this.entry === entry) this.entry = null;
    });
    return entry.value;
  }

  clear(): void {
    this.entry = null;
  }
}
