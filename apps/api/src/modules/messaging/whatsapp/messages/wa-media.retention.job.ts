import { isPlayableMime } from '@ab/shared';
import { Injectable, Logger, type OnApplicationBootstrap, type OnModuleDestroy } from '@nestjs/common';
import { BUCKETS } from '../../../../common/storage/storage.paths';
import { StorageService } from '../../../../common/storage/storage.service';
import { InboundMediaQueries } from './inbound-media.queries';

const DAY_MS = 86_400_000;
const EVERY_MS = 24 * 3_600_000;
/** Not on boot: every API test boots AppModule (the AlertsJob rule). */
const FIRST_RUN_MS = 15 * 60_000;
export const RETENTION_DAYS = 30;
export const BATCH = 100;
/** Per run: enough for the staging backlog; the rest waits for the next day. */
export const MAX_BATCHES = 50;

/**
 * Inbound voice notes and videos (PLAYABLE_MIMES) we cached in wa-media are deleted 30 days after
 * the family sent them (owner 2026-10-19 #2); photos and PDFs are never purged, and sent files
 * (out/…) are never touched. Each batch removes the objects, then clears media_path, so a purged
 * row reads as mediaExpired (410). Idempotent: a cleared row is not selected again, and a removal
 * that fails leaves the path for the next day. ponytail: in-process timer like ActivityRetentionJob.
 */
@Injectable()
export class WaMediaRetentionJob implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly log = new Logger(WaMediaRetentionJob.name);
  private readonly timers: NodeJS.Timeout[] = [];

  constructor(
    private readonly queries: InboundMediaQueries,
    private readonly storage: StorageService,
  ) {}

  onApplicationBootstrap(): void {
    const tick = () => void this.runOnce();
    this.timers.push(setTimeout(tick, FIRST_RUN_MS).unref(), setInterval(tick, EVERY_MS).unref());
  }

  onModuleDestroy(): void {
    this.timers.forEach(clearTimeout);
  }

  /** Never throws; the number of files purged. Any error is logged and ends this run. */
  async runOnce(now: Date = new Date()): Promise<number> {
    const before = new Date(now.getTime() - RETENTION_DAYS * DAY_MS).toISOString();
    let purged = 0;
    try {
      for (let i = 0; i < MAX_BATCHES; i++) {
        const rows = await this.queries.cachedBefore({ before, limit: BATCH });
        // The query already filters by mime; this guard keeps a photo or PDF safe whatever it returns.
        const playable = rows.filter((r) => isPlayableMime(r.media_mime));
        if (!playable.length) break;
        await this.storage.removeMany({ bucket: BUCKETS.waMedia, paths: playable.map((r) => r.media_path) });
        await this.queries.clearPaths(playable.map((r) => r.id));
        purged += playable.length;
        if (rows.length < BATCH) break;
      }
    } catch (e) {
      this.log.error(`wa-media retention failed after ${purged} files: ${String(e)}`);
    }
    return purged;
  }
}
