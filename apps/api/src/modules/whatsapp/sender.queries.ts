import type { Json } from '@ab/db';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../common/db/db.module';
import { CLAIM_LEASE_MS, reportIdOf, type FailurePlan } from './send-plan';
import type { TemplateRow } from './whatsapp.types';

/** A queued outbound row with what expiry and the failure push need. */
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
  attempts: number;
  expires_at: string | null;
  lesson: { starts_at: string } | null;
  guardian: { name: string } | null;
  lead: { name: string | null } | null;
}

const DUE_COLUMNS = 'id, phone_e164, lead_id, lesson_id, template_key, template_params, body, reply_to_wa_id, dedup_key, attempts, expires_at, lesson:lessons(starts_at), guardian:guardians(name), lead:leads(name)';

/**
 * The delivery side effects, for a send and for the admin's manual send (R-MSG-03): the lead's
 * last_outbound_at, and lesson_reports.sent_at for a report_ready row (id = dedup key suffix).
 */
export async function stampDelivered(db: Db, input: { leadId: string | null; dedupKey: string | null; at: string }): Promise<void> {
  if (input.leadId) {
    const { error } = await db.from('leads').update({ last_outbound_at: input.at }).eq('id', input.leadId);
    if (error) throw new Error(`lead last_outbound_at failed: ${error.message}`);
  }
  const reportId = reportIdOf(input.dedupKey);
  if (!reportId) return;
  const { error } = await db.from('lesson_reports').update({ sent_at: input.at }).eq('id', reportId).is('sent_at', null);
  if (error) throw new Error(`report sent_at failed: ${error.message}`);
}

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

  /** attempts n → n+1 and a lease; null when another worker (or the admin) got there first. */
  async claim(input: { id: string; attempts: number; now: Date }): Promise<number | null> {
    const attempts = input.attempts + 1;
    const { data, error } = await this.db
      .from('messages')
      .update({ attempts, next_attempt_at: new Date(input.now.getTime() + CLAIM_LEASE_MS).toISOString() })
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
    await stampDelivered(this.db, { leadId: input.row.lead_id, dedupKey: input.row.dedup_key, at });
    return data.length > 0;
  }

  async failure(id: string, plan: FailurePlan): Promise<void> {
    const { error } = await this.db.from('messages').update(plan).eq('id', id).eq('status', 'queued');
    if (error) throw new Error(`message failure write failed: ${error.message}`);
  }

  /** Past its use (a reminder after the lesson started): failed, never sent, no push. */
  async expire(id: string): Promise<void> {
    const { error } = await this.db
      .from('messages')
      .update({ status: 'failed', error_code: 'expired', error_text: 'expired before it was sent', next_attempt_at: null })
      .eq('id', id)
      .eq('status', 'queued');
    if (error) throw new Error(`message expiry write failed: ${error.message}`);
  }
}
