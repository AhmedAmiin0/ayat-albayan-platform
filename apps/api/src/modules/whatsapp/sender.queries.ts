import type { WaLine } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../common/db/db.module';
import type { StaffAtSend } from '../reminders/staff-reachable';
import { allowedRecipients, lineEnvs, loadEnv } from '../../env';
import { stampDelivered } from './delivered';
import { CLAIM_LEASE_MS, SENDING, type FailurePlan } from './send-plan';
import { AUTO_OFF, AUTOMATIC_KEYS } from './send-stale';
import { DUE_COLUMNS, type DueMessage } from './sender.due';
import { staffAtSend } from './staff-at-send';
import type { TemplateRow } from './whatsapp.types';

export type { DueMessage } from './sender.due';

/** The outbound queue is `messages` itself (docs/12 §3.3); every state change is compare-and-set. */
@Injectable()
export class SenderQueries {
  /** WA_ALLOWED_RECIPIENTS, read per call (docs/12 §13.5a): rows to other phones are never read. */
  get allowed(): readonly string[] | null {
    return allowedRecipients(loadEnv());
  }
  /** Chat client configured, read per call: without it chat-stamped texts can never send (review A, C1). */
  get chatConfigured(): boolean {
    return lineEnvs(loadEnv()).chat !== null;
  }

  constructor(@Inject(DB) private readonly db: Db) {}

  /** A staff alert's teacher as on record now (send-time staffStale); undefined for any other row. */
  staffAtSend(row: DueMessage): Promise<StaffAtSend[] | undefined> {
    return staffAtSend(this.db, row);
  }

  async approvedTemplates(): Promise<TemplateRow[]> {
    const { data, error } = await this.db.from('message_templates').select('*').eq('status', 'approved');
    if (error) throw new Error(`templates read failed: ${error.message}`);
    return data;
  }

  /**
   * Due rows, oldest first: queued outbound, scheduled_for and next_attempt_at reached, and a
   * session text or an approved template. Rows of other templates are not read at all, so a
   * pile waiting for Meta's approval never starves the rest. Nor are chat-stamped texts while the
   * chat client is not configured (they would fill the batch forever).
   */
  async due(input: { keys: readonly string[]; now: Date; limit: number }): Promise<DueMessage[]> {
    const now = input.now.toISOString();
    const approved = input.keys.length ? `,template_key.in.(${input.keys.join(',')})` : '';
    const query = this.db
      .from('messages')
      .select(DUE_COLUMNS)
      .eq('direction', 'outbound')
      .eq('status', 'queued')
      .or(`scheduled_for.is.null,scheduled_for.lte.${now}`)
      .or(`next_attempt_at.is.null,next_attempt_at.lte.${now}`)
      .or(`template_key.is.null${approved}`);
    const allowed = this.allowed;
    const sendable = this.chatConfigured ? query : query.or('template_key.not.is.null,line.is.null,line.neq.chat');
    const scoped = allowed ? sendable.in('phone_e164', [...allowed]) : sendable;
    const { data, error } = await scoped.order('scheduled_for', { ascending: true, nullsFirst: true }).limit(input.limit);
    if (error) throw new Error(`outbound queue read failed: ${error.message}`);
    return data;
  }

  /**
   * Automatic messages OFF: every job-made reminder / follow-up / renewal still queued is held
   * (failed «auto_off», no push), also under a template Meta has not approved yet, which due()
   * never reads and which would otherwise go out on its own once approved and switched ON. Not a
   * row already claimed (SENDING): Meta may have sent it; the worker asks the admin. Returns the count.
   */
  async holdAutomatic(): Promise<number> {
    const query = this.db
      .from('messages')
      .update({ status: 'failed', error_code: AUTO_OFF.code, error_text: AUTO_OFF.text, next_attempt_at: null })
      .eq('direction', 'outbound')
      .eq('status', 'queued')
      .is('created_by', null)
      .in('template_key', [...AUTOMATIC_KEYS])
      .or(`error_code.is.null,error_code.neq.${SENDING}`);
    const allowed = this.allowed;
    const scoped = allowed ? query.in('phone_e164', [...allowed]) : query;
    const { data, error } = await scoped.select('id');
    if (error) throw new Error(`automatic hold failed: ${error.message}`);
    return data.length;
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
      .select('id');
    if (error) throw new Error(`message claim failed: ${error.message}`);
    return data.length ? attempts : null;
  }

  /** false = the admin marked it sent by hand meanwhile: their status stands. */
  async sent(input: { row: DueMessage; waMessageId: string; at: Date }): Promise<boolean> {
    const at = input.at.toISOString();
    const { data, error } = await this.db
      .from('messages')
      .update({ status: 'sent', sent_at: at, wa_message_id: input.waMessageId, next_attempt_at: null, error_code: null, error_text: null })
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
