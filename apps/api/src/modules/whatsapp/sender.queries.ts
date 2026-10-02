import type { Json } from '@ab/db';
import type { LessonStatus } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../common/db/db.module';
import { stampDelivered } from './delivered';
import { CLAIM_LEASE_MS, SENDING, type FailurePlan } from './send-plan';
import type { StaleLead } from './send-stale';
import type { TemplateRow } from './whatsapp.types';

/** A queued outbound row with what expiry, staleness and the failure push need. */
export interface DueMessage {
  id: string;
  phone_e164: string;
  lead_id: string | null;
  lesson_id: string | null;
  template_key: string | null;
  template_params: Json | null;
  body: string | null;
  reply_to_wa_id: string | null;
  dedup_key: string | null;
  /** The admin who wrote it from the inbox; null for rows the jobs queued (isAutomatic). */
  created_by: string | null;
  attempts: number;
  expires_at: string | null;
  /** SENDING = a previous try was claimed and never resolved (send-plan). */
  error_code: string | null;
  lesson: { starts_at: string; status: LessonStatus } | null;
  guardian: { name: string } | null;
  lead: (StaleLead & { name: string | null }) | null;
}

const DUE_COLUMNS =
  'id, phone_e164, lead_id, lesson_id, template_key, template_params, body, reply_to_wa_id, dedup_key, created_by, attempts, expires_at, error_code, lesson:lessons(starts_at, status), guardian:guardians(name), lead:leads(name, status, follow_up_paused, last_inbound_at, created_at)';

/** The outbound queue is `messages` itself (docs/12 §3.3); every state change is compare-and-set. */
@Injectable()
export class SenderQueries {
  constructor(@Inject(DB) private readonly db: Db) {}

  async approvedTemplates(): Promise<TemplateRow[]> {
    const { data, error } = await this.db.from('message_templates').select('*').eq('status', 'approved');
    if (error) throw new Error(`templates read failed: ${error.message}`);
    return data;
  }

  /**
   * Due rows, oldest first: queued outbound, scheduled_for and next_attempt_at reached, and a
   * session text or an approved template. Rows of other templates are not read at all, so a
   * pile waiting for Meta's approval never starves the rest.
   */
  async due(input: { keys: readonly string[]; now: Date; limit: number }): Promise<DueMessage[]> {
    const now = input.now.toISOString();
    const approved = input.keys.length ? `,template_key.in.(${input.keys.join(',')})` : '';
    const { data, error } = await this.db
      .from('messages')
      .select(DUE_COLUMNS)
      .eq('direction', 'outbound')
      .eq('status', 'queued')
      .or(`scheduled_for.is.null,scheduled_for.lte.${now}`)
      .or(`next_attempt_at.is.null,next_attempt_at.lte.${now}`)
      .or(`template_key.is.null${approved}`)
      .order('scheduled_for', { ascending: true, nullsFirst: true })
      .limit(input.limit);
    if (error) throw new Error(`outbound queue read failed: ${error.message}`);
    return data;
  }

  /**
   * attempts n → n+1, a lease, and error_code SENDING written ahead of the Meta call: if the outcome
   * is never recorded (the «sent» write failed, the process died) the next pass sees SENDING and
   * asks the admin instead of sending again. null when another worker (or the admin) got there first.
   */
  async claim(input: { id: string; attempts: number; now: Date }): Promise<number | null> {
    const attempts = input.attempts + 1;
    const lease = new Date(input.now.getTime() + CLAIM_LEASE_MS).toISOString();
    const { data, error } = await this.db
      .from('messages')
      .update({ attempts, next_attempt_at: lease, error_code: SENDING })
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
