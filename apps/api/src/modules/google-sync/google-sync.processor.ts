import { Injectable, Logger } from '@nestjs/common';
import { classify, errorText, MAX_ATTEMPTS, retryDelayMs } from './backoff';
import { GoogleConnection } from './google-connection';
import { GoogleData } from './google-data';
import type { ItemResult, SyncItem } from './google-items.queries';
import { GoogleWriters } from './google-writers';
import type { WriteCtx } from './write-context';

/** ponytail: 25 a pass is far above a few dozen lessons and reports a day; the pass loops while full. */
const BATCH = 25;

export type PassSummary = { claimed: number; synced: number; skipped: number; gone: number; failed: number; retried: number; stopped: boolean };

/**
 * One outbox pass (docs/24 §3): nothing while sync is OFF; dry_run plans every item with NO Google
 * call; live writes through the connected client. 429/5xx retry with jittered backoff (5 attempts),
 * invalid_grant disconnects and stops the pass (the claimed rows go back untouched). Each finish
 * matches its claim token, so an item re-queued meanwhile is processed again with the new data.
 */
@Injectable()
export class GoogleSyncProcessor {
  private readonly log = new Logger(GoogleSyncProcessor.name);

  constructor(
    private readonly data: GoogleData,
    private readonly connection: GoogleConnection,
    private readonly writers: GoogleWriters,
  ) {}

  async runOnce(): Promise<PassSummary> {
    const out: PassSummary = { claimed: 0, synced: 0, skipped: 0, gone: 0, failed: 0, retried: 0, stopped: false };
    const s = await this.data.settings.read();
    if (!s.enabled) return out;
    let ctx: WriteCtx = { live: false };
    if (s.mode === 'live') {
      const google = await this.connection.client();
      if (!google) return out;
      ctx = { live: true, google };
    }
    const claimed = await this.data.items.claim(BATCH);
    out.claimed = claimed.length;
    for (const [i, item] of claimed.entries()) {
      const result = await this.one(item, ctx);
      if (result === 'auth') {
        out.stopped = true;
        for (const rest of claimed.slice(i)) await this.data.items.release(rest);
        await this.connection.authFailed();
        break;
      }
      await this.data.items.finish(item, result);
      if (item.kind === 'report_pdf' && result.state === 'synced') await this.data.items.requeueReportRows({ reportId: item.subject_id, studentId: item.student_id });
      out[result.state === 'retry' ? 'retried' : result.state] += 1;
    }
    await this.data.account.update({ last_run_at: new Date().toISOString() });
    if (out.claimed) this.log.log(`google sync pass: ${JSON.stringify(out)}`);
    return out;
  }

  private async one(item: SyncItem, ctx: WriteCtx): Promise<ItemResult | 'auth'> {
    try {
      return await this.writers.of(item.kind).write(item, ctx);
    } catch (e) {
      const cls = classify(e);
      if (cls === 'auth') return 'auth';
      const attempts = item.attempts + 1;
      const error = errorText(e);
      this.log.warn(`google sync ${item.kind} ${item.id} attempt ${attempts}: ${error}`);
      if (cls === 'fatal' || attempts >= MAX_ATTEMPTS) return { state: 'failed', error, attempts };
      return { state: 'retry', error, attempts, at: new Date(Date.now() + retryDelayMs(attempts)) };
    }
  }
}
