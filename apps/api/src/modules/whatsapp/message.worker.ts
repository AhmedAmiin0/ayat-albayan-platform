import { messageExpired } from '@ab/shared';
import { Injectable, Logger } from '@nestjs/common';
import { PushService } from '../../common/push/push.service';
import { retry, sleep } from '../report-pdf/retry';
import { MessageDispatch } from './message.dispatch';
import { failurePlan, messageLabel, readyToSend, SENDING } from './send-plan';
import { isAutomatic, staleReason } from './send-stale';
import { SenderQueries, type DueMessage } from './sender.queries';
import { WaError, type TemplateRow, type WaSent } from './whatsapp.types';

/** paused = the token is broken (auth error): the sender stops this pass. */
/** held = a job-made reminder / follow-up / renewal while automatic messages are OFF (auto_off). */
export type SendOutcome = 'sent' | 'retry' | 'failed' | 'expired' | 'stale' | 'held' | 'paused' | 'skipped';

export interface SendJob {
  row: DueMessage;
  /** The approved registry row of row.template_key; null for a session text. */
  template: TemplateRow | null;
  now: Date;
  /** settings.auto_messages_enabled, read once per pass by the sender. */
  autoOn: boolean;
}

/**
 * Writing «sent» after Meta accepted is retried hard. If all tries fail, the claim's SENDING mark
 * stays on the row and the next pass hands it to the admin (UNCERTAIN) instead of resending.
 */
const RECORD_DELAYS_MS = [500, 2_000] as const;

/** A row still marked SENDING: a try was made and its outcome never recorded. */
const UNRECORDED = new WaError('the last try was never recorded; check WhatsApp before resending', {
  code: null,
  status: 0,
  uncertain: true,
});

/**
 * One queued row, end to end (docs/12 §3.3): expiry, send-time staleness, the automatic-messages
 * hold (auto_off), claim, send, outcome.
 * Never throws. Idempotency: a row is claimed by compare-and-set before Meta is called, so two
 * workers never send it twice; producers dedupe the row itself by dedup_key.
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

  private async run({ row, template, now, autoOn }: SendJob): Promise<SendOutcome> {
    const lessonStartsAt = row.lesson?.starts_at ?? null;
    if (messageExpired({ templateKey: row.template_key, expiresAt: row.expires_at, lessonStartsAt, now })) {
      await this.queries.expire(row.id, { code: 'expired', text: 'expired before it was sent' });
      return 'expired';
    }
    const stale = staleReason(row);
    if (stale) {
      await this.queries.expire(row.id, { code: 'stale', text: stale });
      return 'stale';
    }
    if (row.error_code === SENDING) return this.failed({ row, error: UNRECORDED, attempts: row.attempts, now });
    // Not left queued: it would go out at a wrong time once the switch is back ON. No push.
    if (!autoOn && isAutomatic(row)) {
      await this.queries.expire(row.id, { code: 'auto_off', text: 'automatic messages are off in settings' });
      return 'held';
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
    const { row, now } = input;
    const plan = failurePlan(input);
    await this.queries.failure(row.id, plan);
    if (plan.attempts !== undefined) {
      // The token, not the message: rows wait; one push a day (fixed in Business Manager).
      this.log.error(`WhatsApp refused the token (${plan.error_code}); sending paused: ${plan.error_text}`);
      await this.alert(row, `whatsapp_auth:${now.toISOString().slice(0, 10)}`);
      return 'paused';
    }
    if (plan.status === 'queued') return 'retry';
    this.log.warn(`message ${row.id} failed: ${plan.error_code} ${plan.error_text}`);
    await this.alert(row, `${row.id}:${now.getTime()}`);
    return 'failed';
  }

  /** reminder_failed, keyed per failed try: a row that fails again after the admin's retry pushes again. */
  private alert(row: DueMessage, subject: string): Promise<void> {
    return this.push.notifyAdmins('reminder_failed', {
      subject,
      vars: { template: messageLabel(row), name: row.guardian?.name ?? row.lead?.name ?? row.phone_e164 },
      data: { phone: row.phone_e164, messageId: row.id },
    });
  }
}
