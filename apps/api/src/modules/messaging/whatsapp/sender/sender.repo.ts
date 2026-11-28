import { Inject, Injectable, Optional } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import type { StaffAtSend } from '@/modules/messaging/reminders';
import { allowedRecipients, lineEnvs, loadEnv } from '@/config/env/env';
import { stampDelivered } from '@/modules/messaging/whatsapp/messages/delivered.repo';
import { CLAIM_LEASE_MS, SENDING, type FailurePlan } from './send-plan';
import { NOT_APP_SENT, sentExtras, type DueMessage } from './sender.due';
import type { Lane } from './drain';
import { DueQueueRepo } from './queue/due-queue.repo';
import type { ClaimInput, DueInput } from './queue/due-queue.types';
import { sendableTemplates } from '@/modules/messaging/whatsapp/templates/gate/template-gate.repo';
import { TemplatesRepo } from '@/modules/messaging/whatsapp/templates/catalog/templates.repo';
import type { TemplateRow, WaSent } from '@/modules/messaging/whatsapp/whatsapp.types';
import { pgError } from '@/common/db/errors';

export type { DueMessage } from './sender.due';

/**
 * The outbound queue is `messages` itself (docs/12 §3.3); every state change is compare-and-set.
 */
@Injectable()
export class SenderRepo {
  /** WA_ALLOWED_RECIPIENTS, read per call (docs/12 §13.5a): rows to other phones are never read. */
  get allowed(): readonly string[] | null {
    return allowedRecipients(loadEnv());
  }
  /** Chat client configured, read per call: without it chat-stamped texts can never send. */
  get chatConfigured(): boolean {
    return lineEnvs(loadEnv()).chat !== null;
  }

  private readonly queue: DueQueueRepo;

  constructor(
    @Inject(DB) private readonly db: Db,
    /** The 60 s template copy (docs/42 42-3); absent (unit tests) = read each pass. */
    @Optional() @Inject(TemplatesRepo) private readonly templates?: TemplatesRepo,
  ) {
    this.queue = new DueQueueRepo(db);
  }

  /** A staff alert's teacher as on record now (send-time staffStale); undefined otherwise. */
  staffAtSend(row: DueMessage): Promise<StaffAtSend[] | undefined> {
    return this.queue.staffAtSend(row);
  }

  /**
   * Approved rows; a crm line's teacher_new_student by its CRM template (template-gate.repo).
   * TemplatesRepo's 60 s copy, cleared on every template write (docs/42 42-3); absent: each time.
   */
  approvedTemplates(): Promise<TemplateRow[]> {
    return this.templates ? this.templates.sendable() : sendableTemplates(this.db);
  }

  /** One cheap read: is anything (of `lane`) due now (sender.due.ts)? false = nothing more read. */
  anyDue(now: Date, lane?: Lane): Promise<boolean> {
    return this.queue.anyDue({ now, allowed: this.allowed, ...(lane ? { lane } : {}) });
  }

  /**
   * Due rows, oldest first: queued outbound, scheduled_for and next_attempt_at reached, and a
   * session text or an approved template. Rows of other templates are not read at all, so a
   * pile waiting for Meta's approval never starves the rest. Nor are chat-stamped texts while the
   * chat client is not configured (they would fill the batch forever).
   */
  due(input: DueInput): Promise<DueMessage[]> {
    return this.queue.due({ ...input, allowed: this.allowed, chatConfigured: this.chatConfigured });
  }

  /** Automatic messages OFF: every job-made row still queued is held (sender.due.ts). */
  holdAutomatic(): Promise<number> {
    return this.queue.holdAutomatic(this.allowed);
  }

  /**
   * attempts n → n+1, a lease, and error_code SENDING written ahead of the Meta call: if the
   * outcome is never recorded (the «sent» write failed, the process died) the next pass sees
   * SENDING and asks the admin instead of sending again. null when another worker (or the admin)
   * got there first. `line` (two lines only, docs/12 §13.2) stamps the line used; absent = the
   * update is unchanged. `numberId` (module mode only, docs/23 phase 3) stamps messages.number_id;
   * absent under legacy.
   */
  async claim(input: ClaimInput): Promise<number | null> {
    const attempts = input.attempts + 1;
    const lease = new Date(input.now.getTime() + CLAIM_LEASE_MS).toISOString();
    const line = input.line ? { line: input.line } : {};
    const numberId = input.numberId ? { number_id: input.numberId } : {};
    const { data, error } = await this.db
      .from('messages')
      .update({ attempts, next_attempt_at: lease, error_code: SENDING, ...line, ...numberId })
      .eq('id', input.id)
      .eq('status', 'queued')
      .eq('attempts', input.attempts)
      .or(NOT_APP_SENT) // never a row staff may have sent from the app (docs/19)
      .select('id');
    if (error) throw pgError(error);
    return data.length ? attempts : null;
  }

  /** false = the admin marked it sent by hand meanwhile: their status stands. */
  async sent(input: { row: DueMessage; sent: WaSent; at: Date }): Promise<boolean> {
    const at = input.at.toISOString();
    const { data, error } = await this.db
      .from('messages')
      .update({
        status: 'sent',
        sent_at: at,
        wa_message_id: input.sent.waMessageId,
        next_attempt_at: null,
        error_code: null,
        error_text: null,
        ...sentExtras(input.sent),
      })
      .eq('id', input.row.id)
      .eq('status', 'queued')
      .select('id');
    if (error) throw pgError(error);
    if (data.length === 0) return false; // the admin's manual send already stamped the delivery
    await stampDelivered(this.db, { leadId: input.row.lead_id, dedupKey: input.row.dedup_key, at });
    return true;
  }

  /** `unrecorded`: only while still SENDING at that attempt (a stale copy never overwrites). */
  async failure(id: string, plan: FailurePlan, unrecorded?: { attempts: number }): Promise<void> {
    const base = this.db.from('messages').update(plan).eq('id', id).eq('status', 'queued');
    const at = unrecorded ? base.eq('error_code', SENDING).eq('attempts', unrecorded.attempts) : base;
    const { error } = await at;
    if (error) throw pgError(error);
  }

  /**
   * Never sent, no push: past its use (`expired`: a reminder after the lesson started), no longer
   * wanted (`stale`: its lesson was cancelled, the lead paused or replied; the reason in
   * error_text) or held (`auto_off`: automatic messages are OFF; the admin's retry re-queues it).
   */
  async expire(
    id: string,
    why: { code: 'expired' | 'stale' | 'auto_off'; text: string },
  ): Promise<void> {
    const { error } = await this.db
      .from('messages')
      .update({ status: 'failed', error_code: why.code, error_text: why.text, next_attempt_at: null })
      .eq('id', id)
      .eq('status', 'queued');
    if (error) throw pgError(error);
  }
}
