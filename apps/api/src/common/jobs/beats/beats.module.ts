import { Module } from '@nestjs/common';
import { CacheGuard } from '@/common/infra/cache/cache-guard';
import type { CacheStore } from '@/common/infra/cache/cache-store';
import { CACHE_STORE } from '@/common/infra/cache/shared-cache';
import { appRole } from '@/config/role/app-role';
import { jobBeats } from './beat-book';
import { BeatMirror, BeatReader } from './beat-share';
import type { BeatShareDeps } from './beat-share';

const shareDeps = (store: CacheStore, guard: CacheGuard): BeatShareDeps => ({
  store,
  guard,
  book: jobBeats,
  role: appRole(),
});
const inject = [CACHE_STORE, CacheGuard];
const mirror = (s: CacheStore, g: CacheGuard): BeatMirror => new BeatMirror(shareDeps(s, g));
const reader = (s: CacheStore, g: CacheGuard): BeatReader => new BeatReader(shareDeps(s, g));

/** The worker mirrors its heartbeats to Redis; every process reads them (docs/09 «Readiness»). */
@Module({
  providers: [
    { provide: BeatMirror, inject, useFactory: mirror },
    { provide: BeatReader, inject, useFactory: reader },
  ],
  exports: [BeatReader],
})
export class BeatsModule {}
