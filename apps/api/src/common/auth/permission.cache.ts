import type { Permission } from '@ab/shared';
import { PERMISSION_PREFIX, permissionKey } from '../cache/cache-keys';
import type { SharedCache } from '../cache/shared-cache';

/** How long a user's resolved permission set is reused before the DB is read again. */
export const PERMISSION_TTL_MS = 30_000;
/** The shared copy lives half as long: a local copy taken from it is then at most 45 s old. */
const SHARED_TTL_MS = PERMISSION_TTL_MS / 2;

type Perms = readonly Permission[];

interface Entry {
  value: Promise<Perms>;
  expires: number;
}

/**
 * Per-user cache of resolved permission sets: a short TTL bounds staleness, and clear() (called by
 * every role / assignment change) makes changes immediate here and, with Redis, in every other API
 * copy and the worker (the `permissions` topic). On a miss the shared copy (permission names only,
 * 15 s) is asked before the DB. Provided as a plain value by AuthModule (the clock is
 * injectable for tests). Concurrent requests of one user share a single load; a failed load (a
 * disabled account included) is never cached.
 */
export class PermissionCache {
  private readonly entries = new Map<string, Entry>();
  private generation = 0;

  constructor(
    private readonly now: () => number = Date.now,
    private readonly shared?: SharedCache,
  ) {
    shared?.on('permissions', () => this.dropLocal());
  }

  get(key: string, load: () => Promise<Perms>): Promise<Perms> {
    const hit = this.entries.get(key);
    if (hit && hit.expires > this.now()) return hit.value;
    const generation = this.generation;
    const shared = this.shared;
    const value = shared ? shared.read({ key: permissionKey(key), ttlMs: SHARED_TTL_MS, load }) : load();
    this.entries.set(key, { value, expires: this.now() + PERMISSION_TTL_MS });
    value.catch(() => {
      if (this.generation === generation && this.entries.get(key)?.value === value) this.entries.delete(key);
    });
    return value;
  }

  /** Forget everything, everywhere: a role's grants or a user's role changed. */
  clear(): void {
    this.dropLocal();
    void this.shared?.invalidate({ topic: 'permissions', prefix: PERMISSION_PREFIX });
  }

  private dropLocal(): void {
    this.generation += 1;
    this.entries.clear();
  }
}
