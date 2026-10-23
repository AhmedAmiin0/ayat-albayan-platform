import { Injectable, Logger } from '@nestjs/common';
import { RecordingEraser } from './recording-eraser';
import { RecordingRetentionQueries } from './recording-retention.queries';
import { RecordingSettings } from './recordings.settings';

export const RETENTION_KEY = 'recording_retention_days';
/** A lesson never runs this long: a row still `recording` after it lost its egress webhook. */
export const STUCK_AFTER_MS = 6 * 3_600_000;
const BATCH = 100;
const MAX_BATCHES = 10;
const DAY_MS = 86_400_000;

/**
 * Recording clean-up: marks rows stuck in `recording` for over 6 hours as failed, and (only when
 * the owner set `recording_retention_days`) deletes the files of older recordings (internal-meeting recordings too) and keeps the
 * rows as `deleted`. Idempotent: both sweeps select only rows they have not handled.
 */
@Injectable()
export class RecordingRetention {
  private readonly log = new Logger(RecordingRetention.name);

  constructor(
    private readonly settings: RecordingSettings,
    private readonly queries: RecordingRetentionQueries,
    private readonly eraser: RecordingEraser,
  ) {}

  /** Whole days, or null = keep forever (unset, not a positive integer, or unreadable). Never throws. */
  async days(): Promise<number | null> {
    try {
      const v = (await this.settings.read())[RETENTION_KEY];
      return typeof v === 'number' && Number.isInteger(v) && v >= 1 ? v : null;
    } catch (e) {
      this.log.warn(`${RETENTION_KEY} unreadable, keeping recordings: ${String(e)}`);
      return null;
    }
  }

  async sweepStuck(now: Date): Promise<number> {
    const cutoff = new Date(now.getTime() - STUCK_AFTER_MS).toISOString();
    return this.queries.failStuck({ cutoff, now: now.toISOString() });
  }

  /** Deletes files older than the retention; 0 and no query at all while the setting is off. */
  async purgeExpired(now: Date): Promise<number> {
    const days = await this.days();
    if (days === null) return 0;
    const cutoff = new Date(now.getTime() - days * DAY_MS).toISOString();
    let purged = 0;
    for (let i = 0; i < MAX_BATCHES; i++) {
      const rows = await this.queries.expired({ cutoff, limit: BATCH });
      const done = await Promise.all(rows.map((r) => this.purgeOne(r, { days, now })));
      purged += done.filter(Boolean).length;
      if (rows.length < BATCH || !done.some(Boolean)) break;
    }
    return purged;
  }

  /** A failed storage call leaves the row alone: the next run tries it again. */
  private async purgeOne(row: { id: string; file_path: string }, ctx: { days: number; now: Date }): Promise<boolean> {
    try {
      return await this.eraser.erase({
        id: row.id,
        filePath: row.file_path,
        actorId: null,
        now: ctx.now,
        audit: { action: 'retention_delete', after: { retention_days: ctx.days } },
      });
    } catch (e) {
      this.log.error(`recording ${row.id} not purged: ${String(e)}`);
      return false;
    }
  }
}
