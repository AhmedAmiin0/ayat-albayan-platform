import type { TablesInsert } from '@ab/db';
import { Inject, Injectable, Logger, type OnModuleDestroy } from '@nestjs/common';
import { DB, type Db } from '../db/db.module';

export type ActivityInsert = TablesInsert<'activity_log'>;

const FLUSH_MS = 3_000;
const BATCH = 200;
/** Back-pressure: past this many unwritten rows new ones are dropped (and counted), never awaited. */
const MAX_QUEUE = 5_000;
/** An actor whose auth.users row is gone: the batch is retried row by row. */
const FK_VIOLATION = '23503';

/**
 * Fire-and-forget writer of activity_log rows: `push` only queues; a timer flushes in batches every
 * few seconds (started on the first push, so idle apps and tests make no DB call). Never throws:
 * a failed insert is logged and the rows dropped — logging must never fail or slow a request.
 */
@Injectable()
export class ActivityWriter implements OnModuleDestroy {
  private readonly log = new Logger(ActivityWriter.name);
  private queue: ActivityInsert[] = [];
  private timer: NodeJS.Timeout | null = null;
  private dropped = 0;

  constructor(@Inject(DB) private readonly db: Db) {}

  push(row: ActivityInsert): void {
    if (this.queue.length >= MAX_QUEUE) {
      this.dropped += 1;
      return;
    }
    this.queue.push(row);
    this.schedule();
  }

  /** Writes everything queued. Resolves even when the database is down. */
  async flush(): Promise<void> {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    while (this.queue.length > 0) {
      const batch = this.queue.splice(0, BATCH);
      await this.write(batch);
    }
    if (this.dropped > 0) {
      this.log.warn(`activity_log: ${this.dropped} rows dropped (queue full)`);
      this.dropped = 0;
    }
  }

  onModuleDestroy(): Promise<void> {
    return this.flush();
  }

  private schedule(): void {
    if (this.timer) return;
    this.timer = setTimeout(() => void this.flush(), FLUSH_MS);
    this.timer.unref();
  }

  private async write(batch: ActivityInsert[]): Promise<void> {
    try {
      const { error } = await this.db.from('activity_log').insert(batch);
      if (!error) return;
      if (error.code === FK_VIOLATION && batch.length > 1) {
        for (const row of batch) await this.write([row]);
        return;
      }
      this.log.warn(`activity_log insert failed (${batch.length} rows): ${error.message}`);
    } catch (e) {
      this.log.warn(`activity_log insert failed (${batch.length} rows): ${String(e)}`);
    }
  }
}
