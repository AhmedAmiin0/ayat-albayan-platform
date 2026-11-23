import type { JobBeat } from '@ab/shared';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ar } from '@/common/infra/i18n/server-text';
import { isStale } from '@/common/jobs/beats';
import { PushService } from '@/common/push/push.service';

const MIN = 60_000;
const day = (ms: number): string => new Date(ms).toISOString().slice(0, 10);
const minutes = (ms: number): string => String(Math.max(1, Math.round(ms / MIN)));

function reason(b: JobBeat, now: number): string {
  return ar.backgroundJobs.staleReason
    .replace('{name}', b.name)
    .replace('{minutes}', minutes(now - (b.lastOkAt ?? b.since)))
    .replace('{every}', minutes(b.everyMs))
    .replace('{error}', b.lastError ?? ar.backgroundJobs.noError);
}

/**
 * One admin bell alert when a job goes stale (the Google sync's bell pattern: bell only, never
 * WhatsApp). Raised once per stale spell in this process, and the dedup key carries the day, so a
 * worker restart the same day does not raise it again. Fresh again → the next spell alerts anew.
 */
@Injectable()
export class StaleAlerts {
  private readonly log = new Logger(StaleAlerts.name);
  private readonly told = new Set<string>();

  // @Inject(Class): the class is a value here (DI), not only a type (docs/31b §3.2).
  constructor(@Inject(PushService) private readonly push: PushService) {}

  async check(beats: readonly JobBeat[], now: number): Promise<void> {
    const stale = beats.filter((b) => isStale(b, now));
    const names = new Set(stale.map((b) => b.name));
    for (const name of [...this.told]) if (!names.has(name)) this.told.delete(name);
    await Promise.all(stale.filter((b) => !this.told.has(b.name)).map((b) => this.tell(b, now)));
  }

  private async tell(b: JobBeat, now: number): Promise<void> {
    const event = {
      subject: `job_stale:${b.name}:${day(now)}`,
      title: ar.backgroundJobs.staleTitle,
      vars: { reason: reason(b, now) },
      bellOnly: true,
    };
    try {
      await this.push.notifyAdmins('google_sync_alert', event);
      this.told.add(b.name);
    } catch (e) {
      this.log.warn(`stale alert for ${b.name} not raised: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
}
