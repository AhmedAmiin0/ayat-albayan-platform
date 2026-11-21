import { Module } from '@nestjs/common';
import type { CacheStore } from '@/common/infra/cache/cache-store';
import { CACHE_STORE } from '@/common/infra/cache/shared-cache';
import { BeatReader, BeatsModule, jobBeats } from '@/common/jobs/beats';
import { StorageOpsModule } from '@/common/storage/probe';
import { HealthController } from './health.controller';
import { JobsStatusController, JobWatchJob, StaleAlerts, WATCH_SOURCE } from './jobs';
import { readinessDeps } from './readiness.deps';
import { ReadinessRepo } from './readiness.repo';
import { READINESS_DEPS, ReadinessService } from './readiness.service';
import { ReadyController } from './ready.controller';

/**
 * /health (liveness, the load balancer's), /ready (readiness: deploy gate, uptime monitor) and the
 * background jobs' heartbeats: GET /admin/jobs and the stale-job bell alert.
 */
@Module({
  imports: [StorageOpsModule, BeatsModule],
  controllers: [HealthController, ReadyController, JobsStatusController],
  providers: [
    ReadinessRepo,
    {
      provide: READINESS_DEPS,
      inject: [ReadinessRepo, CACHE_STORE, BeatReader],
      useFactory: (repo: ReadinessRepo, store: CacheStore, reader: BeatReader) =>
        readinessDeps({ repo, store, reader }),
    },
    ReadinessService,
    StaleAlerts,
    { provide: WATCH_SOURCE, useValue: { book: jobBeats, now: Date.now } },
    JobWatchJob,
  ],
})
export class HealthModule {}
