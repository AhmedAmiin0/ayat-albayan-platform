import type { CacheGuard } from '@/common/infra/cache/cache-guard';
import type { CacheStore } from '@/common/infra/cache/cache-store';
import type { AppRole } from '@/config/role/app-role';
import type { BeatBook } from '@/common/jobs/beats/beat-book';

/** What the mirror and the reader need: the shared cache's store and guard, the book, the role. */
export interface BeatShareDeps {
  store: CacheStore;
  guard: CacheGuard;
  book: BeatBook;
  role: AppRole;
}
