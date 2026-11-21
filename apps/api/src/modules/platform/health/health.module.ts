import { Module } from '@nestjs/common';
import type { CacheStore } from '@/common/infra/cache/cache-store';
import { CACHE_STORE } from '@/common/infra/cache/shared-cache';
import { BeatReader, BeatsModule } from '@/common/jobs/beats';
import { StorageOpsModule } from '@/common/storage/probe';
import { HealthController } from './health.controller';
import { readinessDeps } from './readiness.deps';
import { ReadinessRepo } from './readiness.repo';
import { READINESS_DEPS, ReadinessService } from './readiness.service';
import { ReadyController } from './ready.controller';

/** /health (liveness, the load balancer's) and /ready (readiness: deploy gate, uptime monitor). */
@Module({
  imports: [StorageOpsModule, BeatsModule],
  controllers: [HealthController, ReadyController],
  providers: [
    ReadinessRepo,
    {
      provide: READINESS_DEPS,
      inject: [ReadinessRepo, CACHE_STORE, BeatReader],
      useFactory: (repo: ReadinessRepo, store: CacheStore, reader: BeatReader) =>
        readinessDeps({ repo, store, reader }),
    },
    ReadinessService,
  ],
})
export class HealthModule {}
