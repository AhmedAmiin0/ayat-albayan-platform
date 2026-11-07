import { onMessagingLine, type WaLine } from '@ab/shared';
import { Inject, Injectable, Optional } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import type { StaffAtSend } from '@/modules/messaging/reminders/plan/staff-reachable';
import { allowedRecipients, lineEnvs, loadEnv } from '@/config/env/env';
import { stampDelivered } from '@/modules/messaging/whatsapp/messages/delivered';
import { CLAIM_LEASE_MS, SENDING, type FailurePlan } from './send-plan';
import { anyDue, DUE_COLUMNS, holdAutomatic, NOT_APP_SENT, type DueMessage } from './sender.due';
import { staffAtSend } from './staff-at-send';
import { LANE_ROWS, type Lane } from './drain';
import { sendableTemplates } from '@/modules/messaging/whatsapp/templates/gate/template-gate.repo';
import { TemplatesRepo } from '@/modules/messaging/whatsapp/templates/catalog/templates.repo';
import type { TemplateRow, WaSent } from '@/modules/messaging/whatsapp/whatsapp.types';

export type { DueMessage } from './sender.due';

/** due(): the approved keys, now, the batch and (a lane's pass) its lane. */
/** Without a chat client, chat-stamped texts are never read (they would fill the batch forever). */
const NOT_CHAT_TEXT = 'template_key.not.is.null,line.is.null,line.neq.chat';

interface DueInput { keys: readonly string[]; now: Date; limit: number; lane?: Lane }

/** The outbound queue is `messages` itself (docs/12 §3.3); every state change is compare-and-set. */
@Injectable()
export class SenderRepo {
  /** WA_ALLOWED_RECIPIENTS, read per call (docs/12 §13.5a): rows to other phones are never read. */
  get allowed(): readonly string[] | null {
    return allowedRecipients(loadEnv());
  }
  /** Chat client configured, read per call: without it chat-stamped texts can never send (review A, C1). */
  get chatConfigured(): boolean {
    return lineEnvs(loadEnv()).chat !== null;
  }

  constructor(
    @Inject(DB) private readonly db: Db,
    /** The 60 s template copy (docs/42 42-3); absent (unit tests) = read each pass. */
    @Optional() @Inject(TemplatesRepo) private readonly templates?: TemplatesRepo,
  ) {}

  /** A staff alert's teacher as on record now (send-time staffStale); undefined for any other row. */
  staffAtSend(row: DueMessage): Promise<StaffAtSend[] | undefined> {
    return staffAtSend(this.db, row);
  }

  /**
   * Approved rows; a crm line's teacher_new_student by its CRM template (template-gate.repo).
   * Through TemplatesRepo's 60 s copy, cleared on every template write (docs/42 42-3); absent:
   * read each time.
   */
  approvedTemplates(): Promise<TemplateRow[]> {
    return this.templates ? this.templates.sendable() : sendableTemplates(this.db);
  }

  /** One cheap read: is anything (of `lane`) due now (sender.due.ts)? false = nothing more read. */
  anyDue(now: Date, lane?: Lane): Promise<boolean> {
    return anyDue(this.db, { now, allowed: this.allowed, ...(lane ? { lane } : {}) });
  }

  /**
   * Due rows, oldest first: queued outbound, scheduled_for and next_attempt_at reached, and a
   * session text or an approved template. Rows of other templates are not read at all, so a
   * pile waiting for Meta's approval never starves the rest. Nor are chat-stamped texts while the
   * chat client is not configured (they would fill the batch forever).
   */
  async due(input: DueInput): Promise<DueMessage[]> {
    const now = input.now.toISOString();
    const approved = input.keys.length ? `,template_key.in.(${input.keys.join(',')})` : '';
    const query = this.db
      .from('messages')
      .select(DUE_COLUMNS)
      .eq('direction', 'outbound')
      .eq('status', 'queued')
      .or(`scheduled_for.is.null,scheduled_for.lte.${now}`)
      .or(`next_attempt_at.is.null,next_attempt_at.lte.${now}`)
      .or(`template_key.is.null${approved}`)
      .or(NOT_APP_SENT)
      .or('line.is.null,line.neq.calls'); // never a row of the calls number (docs/28 §10)
    const allowed = this.allowed;
    const laned = input.lane ? query.or(LANE_ROWS[input.lane]) : query; // docs/42 42-7
    const sendable = this.chatConfigured ? laned : laned.or(NOT_CHAT_TEXT);
    const scoped = allowed ? sendable.in('phone_e164', [...allowed]) : sendable;
    const ordered = scoped.order('scheduled_for', { ascending: true, nullsFirst: true }).order('created_at');
    const { data, error } = await ordered.limit(input.limit);
    if (error) throw new Error(`outbound queue read failed: ${error.message}`);
    return data.filter(onMessagingLine);
  }

  /** Automatic messages OFF: every job-made row still queued is held (sender.due.ts). */
  holdAutomatic(): Promise<number> {
    return holdAutomatic(this.db, this.allowed);
  }

  /**
   * attempts n → n+1, a lease, and error_code SENDING written ahead of the Meta call: if the outcome
   * is never recorded (the «sent» write failed, the process died) the next pass sees SENDING and
   * asks the admin instead of sending again. null when another worker (or the admin) got there first.
   * `line` (two lines only, docs/12 §13.2) stamps the line used; absent = the update is unchanged.
   * `numberId` (module mode only, docs/23 phase 3) stamps messages.number_id; absent under legacy.
   */
  async claim(input: { id: string; attempts: number; now: Date; line?: WaLine; numberId?: string }): Promise<number | null> {
    const attempts = input.attempts + 1;
    const lease = new Date(input.now.getTime() + CLAIM_LEASE_MS).toISOString();
    const { data, error } = await this.db
      .from('messages')
      .update({ attempts, next_attempt_at: lease, error_code: SENDING, ...(input.line ? { line: input.line } : {}), ...(input.numberId ? { number_id: input.numberId } : {}) })
      .eq('id', input.id)
      .eq('status', 'queued')
      .eq('attempts', input.attempts)
      .or(NOT_APP_SENT) // never a row staff may have sent from the app (docs/19)
      .select('id');
    if (error) throw new Error(`message claim failed: ${error.message}`);
    return data.length ? attempts : null;
  }

  /** false = the admin marked it sent by hand meanwhile: their status stands. */
  async sent(input: { row: DueMessage; sent: WaSent; at: Date }): Promise<boolean> {
    const at = input.at.toISOString();
    const { data, error } = await this.db
      .from('messages')
      .update({ status: 'sent', sent_at: at, wa_message_id: input.sent.waMessageId, next_attempt_at: null, error_code: null, error_text: null, ...(input.sent.asText ? { sent_as_text: true } : {}) })
      .eq('id', input.row.id)
      .eq('status', 'queued')
      .select('id');
    if (error) throw new Error(`message sent write failed: ${error.message}`);
    if (data.length === 0) return false; // the admin's manual send already stamped the delivery
    await stampDelivered(this.db, { leadId: input.row.lead_id, dedupKey: input.row.dedup_key, at });
    return true;
  }

  async failure(id: string, plan: FailurePlan): Promise<void> {
    const { error } = await this.db.from('messages').update(plan).eq('id', id).eq('status', 'queued');
    if (error) throw new Error(`message failure write failed: ${error.message}`);
  }

  /**
   * Never sent, no push: past its use (`expired`: a reminder after the lesson started), no longer
   * wanted (`stale`: its lesson was cancelled, the lead paused or replied; the reason in error_text)
   * or held (`auto_off`: automatic messages are OFF; the admin's retry re-queues it).
   */
  async expire(id: string, why: { code: 'expired' | 'stale' | 'auto_off'; text: string }): Promise<void> {
    const { error } = await this.db
      .from('messages')
      .update({ status: 'failed', error_code: why.code, error_text: why.text, next_attempt_at: null })
      .eq('id', id)
      .eq('status', 'queued');
    if (error) throw new Error(`message expiry write failed: ${error.message}`);
  }
}
