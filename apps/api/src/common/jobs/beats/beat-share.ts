import { jobBeatsSchema, type JobBeat } from '@ab/shared';
import { Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { parseJson } from '@/common/infra/cache/cache-store';
import { runsJobs } from '@/config/role/app-role';
import type { BeatShareDeps } from './beat-share.types';

/** The worker's whole beat list, under the cache prefix (ab:cache:jobs:beats). */
export const BEATS_KEY = 'jobs:beats';
/** Kept a week: a dead worker's last beats stay readable (and stale), never silently gone. */
const BEATS_TTL_MS = 7 * 86_400_000;

type Source = 'local' | 'shared' | 'none';

/** Where this process reads the beats: its own book (it runs the jobs), Redis, or nowhere. */
function sourceOf(deps: BeatShareDeps): Source {
  if (runsJobs(deps.role)) return 'local';
  return deps.store.mode === 'redis' ? 'shared' : 'none';
}

/** The worker copies its book to Redis on every change (REDIS_URL set; else nothing). */
@Injectable()
export class BeatMirror implements OnModuleInit, OnModuleDestroy {
  private off: () => void = () => undefined;

  constructor(private readonly deps: BeatShareDeps) {}

  onModuleInit(): void {
    if (sourceOf(this.deps) !== 'local' || this.deps.store.mode !== 'redis') return;
    this.off = this.deps.book.onChange(() => void this.write());
  }

  onModuleDestroy(): void {
    this.off();
  }

  private write(): Promise<void> {
    const { store, guard, book } = this.deps;
    const value = JSON.stringify(book.list());
    return guard.attempt(() => store.set(BEATS_KEY, value, BEATS_TTL_MS), undefined);
  }
}

/** Every job's heartbeat as this process can see it; null = not visible here (or unreadable). */
@Injectable()
export class BeatReader {
  private readonly sources: Record<Source, () => Promise<JobBeat[] | null>> = {
    local: () => Promise.resolve(this.deps.book.list()),
    shared: () => this.shared(),
    none: () => Promise.resolve(null),
  };

  constructor(private readonly deps: BeatShareDeps) {}

  read(): Promise<JobBeat[] | null> {
    return this.sources[sourceOf(this.deps)]();
  }

  private async shared(): Promise<JobBeat[] | null> {
    const raw = await this.deps.guard.run(() => this.deps.store.get(BEATS_KEY), null);
    const parsed = jobBeatsSchema.safeParse(raw === null ? null : parseJson(raw)?.value);
    return parsed.success ? parsed.data : null;
  }
}
