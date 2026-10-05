import type { Permission } from '@ab/shared';

/** How long a user's resolved permission set is reused before the DB is read again. */
export const PERMISSION_TTL_MS = 30_000;

type Perms = readonly Permission[];

interface Entry {
  value: Promise<Perms>;
  expires: number;
}

/**
 * Per-user cache of resolved permission sets: a short TTL bounds staleness across API instances,
 * and clear() (called by every role / assignment change on this instance) makes changes immediate
 * here. Provided as a plain value by AuthModule (the clock is injectable for tests).
 * Concurrent requests of one user share a single load; a failed load is not cached.
 */
export class PermissionCache {
  private readonly entries = new Map<string, Entry>();
  private generation = 0;

  constructor(private readonly now: () => number = Date.now) {}

  get(key: string, load: () => Promise<Perms>): Promise<Perms> {
    const hit = this.entries.get(key);
    if (hit && hit.expires > this.now()) return hit.value;
    const generation = this.generation;
    const value = load();
    this.entries.set(key, { value, expires: this.now() + PERMISSION_TTL_MS });
    value.catch(() => {
      if (this.generation === generation && this.entries.get(key)?.value === value) this.entries.delete(key);
    });
    return value;
  }

  /** Forget everything: a role's grants or a user's role changed. */
  clear(): void {
    this.generation += 1;
    this.entries.clear();
  }
}
