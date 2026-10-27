import { Injectable, Logger, type OnApplicationBootstrap, type OnModuleDestroy } from '@nestjs/common';
import { CRM_MEDIA_PREFIX, allowedCrmUrl } from '../crm-history/crm-history-url';
import { CrmMediaCopier, type CopyOutcome } from './crm-media-copier';
import { CrmMediaCopyDone } from './crm-media-copy.done';
import { CrmMediaCopySettings } from './crm-media-copy.settings';

/** Two files at a time: the batch of 20 takes ten rounds at most (10 s fetch timeout each). */
const CONCURRENCY = 2;
const EVERY_MS = 60_000;
/** Not on boot, and no minute tick before it: every API test boots AppModule (the AlertsJob rule). */
const FIRST_RUN_MS = 15 * 60_000;

type CopyTick =
  | { state: 'off' | 'busy' | 'done' | 'error' }
  | { state: 'copied'; outcomes: CopyOutcome[] };

/** The setting as a host we may fetch from (allowedCrmUrl's own check), or null (empty or not a DNS name). */
export function copyHost(setting: string): string | null {
  const host = setting.trim().toLowerCase();
  return allowedCrmUrl(`https://${host}${CRM_MEDIA_PREFIX}f`, host) ? host : null;
}

/**
 * Owner 2026-10-27 «Fix it»: a private copy of EVERY family file imported from the old CRM, so its
 * public storage can later be made private. Only while crm_media_copy_all is on and crm_media_host is
 * a host: each minute one batch (BATCH rows, CONCURRENCY at a time) through CrmMediaCopier; when no
 * row is left, CrmMediaCopyDone turns the switch off and writes one audit row. Ticks never overlap
 * (a slow one makes the next return 'busy'); idempotent (a copied row leaves the batch query, a
 * failing one is capped). Never edits a body, never deletes. ponytail: in-process timer like
 * WaMediaRetentionJob; the API runs as one process.
 */
@Injectable()
export class CrmMediaCopyJob implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly log = new Logger(CrmMediaCopyJob.name);
  private readonly timers: NodeJS.Timeout[] = [];
  private running = false;

  constructor(
    private readonly settings: CrmMediaCopySettings,
    private readonly copier: CrmMediaCopier,
    private readonly done: CrmMediaCopyDone,
  ) {}

  onApplicationBootstrap(): void {
    const tick = () => void this.runOnce();
    const start = () => {
      tick();
      this.timers.push(setInterval(tick, EVERY_MS).unref());
    };
    this.timers.push(setTimeout(start, FIRST_RUN_MS).unref());
  }

  onModuleDestroy(): void {
    this.timers.forEach(clearTimeout);
  }

  /** Never throws: an error is logged and the next tick tries again. */
  async runOnce(): Promise<CopyTick> {
    if (this.running) return { state: 'busy' };
    this.running = true;
    try {
      return await this.tick();
    } catch (e) {
      this.log.error(`crm media copy failed: ${String(e)}`);
      return { state: 'error' };
    } finally {
      this.running = false;
    }
  }

  private async tick(): Promise<CopyTick> {
    const values = await this.settings.read();
    const host = copyHost(values.crm_media_host);
    if (!values.crm_media_copy_all || !host) return { state: 'off' };
    const ids = await this.copier.next(host);
    if (!ids.length) {
      const counts = await this.done.finish(host);
      this.log.log(`crm media copy done: ${JSON.stringify(counts)}`);
      return { state: 'done' };
    }
    const outcomes: CopyOutcome[] = [];
    for (let i = 0; i < ids.length; i += CONCURRENCY) {
      const round = ids.slice(i, i + CONCURRENCY).map((id) => this.copier.copy(id, host));
      outcomes.push(...(await Promise.all(round)));
    }
    return { state: 'copied', outcomes };
  }
}
