import {
  REVISION_CHECK_MS,
  type ConfigSnapshot,
} from '@/common/configuration/config-store/config-store.types';

/** The two reads the cache needs (ConfigStoreRepo). */
interface SnapshotSource {
  snapshot(): Promise<ConfigSnapshot>;
  revision(): Promise<number>;
}

interface CacheEntry {
  at: number;
  checkedAt: number;
  value: Promise<ConfigSnapshot>;
}

/**
 * The read side of the settings store (docs/26 §2c): every row cached as ONE promise for `ttlMs`;
 * once the cache is older than REVISION_CHECK_MS a single query reads settings_revision.rev and,
 * when it differs, the rows are read again. A failed read is never cached.
 */
export class SnapshotCache {
  private entry: CacheEntry | null = null;

  constructor(
    private readonly source: SnapshotSource,
    private readonly ttlMs: number,
  ) {}

  /** The cached rows (revision-checked); rejects on a read failure. */
  read(now: number): Promise<ConfigSnapshot> {
    const c = this.entry;
    if (!c || expired(c, now, this.ttlMs)) {
      return this.remember({ at: now, checkedAt: now, value: this.source.snapshot() });
    }
    if (checkedRecently(c, now)) return c.value;
    return this.remember({ at: c.at, checkedAt: now, value: this.recheck(c.value) });
  }

  /** Forget the rows: the next read asks the database. */
  drop(): void {
    this.entry = null;
  }

  private remember(entry: CacheEntry): Promise<ConfigSnapshot> {
    this.entry = entry;
    // A failed read is not cached: the next call asks the database again.
    entry.value.catch(() => {
      if (this.entry === entry) this.entry = null;
    });
    return entry.value;
  }

  private async recheck(prev: Promise<ConfigSnapshot>): Promise<ConfigSnapshot> {
    const [snap, rev] = await Promise.all([prev, this.source.revision()]);
    return rev === snap.rev ? snap : this.source.snapshot();
  }
}

const expired = (c: CacheEntry, now: number, ttlMs: number): boolean => now - c.at >= ttlMs;

const checkedRecently = (c: CacheEntry, now: number): boolean =>
  now - c.checkedAt < REVISION_CHECK_MS;
