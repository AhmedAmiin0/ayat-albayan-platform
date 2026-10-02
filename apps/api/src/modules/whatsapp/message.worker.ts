import { messageExpired } from '@ab/shared';
import { Injectable, Logger } from '@nestjs/common';
import { PushService } from '../../common/push/push.service';
import { retry, sleep } from '../report-pdf/retry';
import { MessageDispatch } from './message.dispatch';
import { failurePlan, messageLabel, readyToSend } from './send-plan';
import { SenderQueries, type DueMessage } from './sender.queries';
import type { TemplateRow, WaSent } from './whatsapp.types';

export type SendOutcome = 'sent' | 'retry' | 'failed' | 'expired' | 'skipped';

export interface SendJob {
  row: DueMessage;
  /** The approved registry row of row.template_key; null for a session text. */
  template: TemplateRow | null;
  now: Date;
}

/** Writing «sent» after Meta accepted is retried hard: losing it would send the message twice. */
const RECORD_DELAYS_MS = [500, 2_000] as const;

/**
 * One queued row, end to end (docs/12 §3.3): expiry, claim, send, outcome. Never throws.
 * Idempotency: a row is claimed by compare-and-set before Meta is called, so two workers never
 * send it twice; producers dedupe the row itself by dedup_key.
 */
@Injectable()
export class MessageWorker {
  private readonly log = new Logger(MessageWorker.name);
  /** Backoff wait for the «sent» write; tests replace it. */
  wait: (ms: number) => Promise<void> = sleep;

  constructor(
    private readonly queries: SenderQueries,
    private readonly dispatch: MessageDispatch,
    private readonly push: PushService,
  ) {}

  async process(job: SendJob): Promise<SendOutcome> {
    try {
      return await this.run(job);
    } catch (e) {
      this.log.error(`message ${job.row.id}: ${e instanceof Error ? e.message : String(e)}`);
      return 'skipped';
    }
  }

  private async run({ row, template, now }: SendJob): Promise<SendOutcome> {
    const lessonStartsAt = row.lesson?.starts_at ?? null;
    if (messageExpired({ templateKey: row.template_key, expiresAt: row.expires_at, lessonStartsAt, now })) {
      await this.queries.expire(row.id);
      return 'expired';
    }
    if (!readyToSend(row, template)) return 'skipped';
    const attempts = await this.queries.claim({ id: row.id, attempts: row.attempts, now });
    if (attempts === null) return 'skipped';
    let sent: WaSent;
    try {
      sent = await this.dispatch.send(row, template);
    } catch (error) {
      return this.failed({ row, error, attempts, now });
    }
    const record = () => this.queries.sent({ row, waMessageId: sent.waMessageId, at: new Date() });
    if (!(await retry(record, { delays: RECORD_DELAYS_MS, sleep: this.wait }))) {
      this.log.log(`message ${row.id} was marked sent by hand while it was sending`);
    }
    return 'sent';
  }

  private async failed(input: { row: DueMessage; error: unknown; attempts: number; now: Date }): Promise<SendOutcome> {
    const { row } = input;
    const plan = failurePlan(input);
    await this.queries.failure(row.id, plan);
    if (plan.status === 'queued') return 'retry';
    this.log.warn(`message ${row.id} failed: ${plan.error_code} ${plan.error_text}`);
    await this.push.notifyAdmins('reminder_failed', {
      subject: row.id,
      vars: { template: messageLabel(row), name: row.guardian?.name ?? row.lead?.name ?? row.phone_e164 },
      data: { phone: row.phone_e164, messageId: row.id },
    });
    return 'failed';
  }
}
