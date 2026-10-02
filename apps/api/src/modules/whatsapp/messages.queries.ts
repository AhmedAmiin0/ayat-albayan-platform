import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../common/db/db.module';
import type { MessageRow } from './message.mapper';
import { stampDelivered } from './delivered';
import { HANDED_OFF, SENDING } from './send-plan';

/** Not while the sender holds the row (its claim): Meta may be sending it right now. */
const NOT_CLAIMED = `error_code.is.null,error_code.neq.${SENDING}`;

/**
 * M1–M3 (docs/12 §4): the admin's retry, «I sent it myself» and the hand-off, all compare-and-set.
 * M2/M3 also skip a row the sender claimed between the admin's read and this write.
 */
@Injectable()
export class MessagesQueries {
  constructor(@Inject(DB) private readonly db: Db) {}

  async get(id: string): Promise<MessageRow | null> {
    const { data, error } = await this.db.from('messages').select('*').eq('id', id).maybeSingle();
    if (error) throw new Error(`message read failed: ${error.message}`);
    return data;
  }

  /** failed → queued with a fresh attempt budget; null when it is no longer failed. */
  async requeue(id: string): Promise<MessageRow | null> {
    const { data, error } = await this.db
      .from('messages')
      .update({ status: 'queued', attempts: 0, next_attempt_at: null, error_code: null, error_text: null })
      .eq('id', id)
      .eq('status', 'failed')
      .select('*')
      .maybeSingle();
    if (error) throw new Error(`message retry failed: ${error.message}`);
    return data;
  }

  /**
   * Outbound queued / failed → sent_manually (R-MSG-03): the sender never sends it again. The
   * delivery side effects follow (lead last_outbound_at, report sent_at).
   */
  async markSentManually(id: string, at: Date): Promise<MessageRow | null> {
    const stamp = at.toISOString();
    const { data, error } = await this.db
      .from('messages')
      .update({ status: 'sent_manually', sent_manually_at: stamp, next_attempt_at: null, error_code: null, error_text: null })
      .eq('id', id)
      .eq('direction', 'outbound')
      .in('status', ['queued', 'failed'])
      .or(NOT_CLAIMED)
      .select('*')
      .maybeSingle();
    if (error) throw new Error(`message manual send failed: ${error.message}`);
    if (data) await stampDelivered(this.db, { leadId: data.lead_id, dedupKey: data.dedup_key, at: stamp });
    return data;
  }

  /**
   * M3: the admin opened wa.me to send it from their own WhatsApp. Held as failed «handed_off»
   * (the sender never reads failed rows) until they confirm (M2) or put it back (M1).
   */
  async handOff(id: string): Promise<MessageRow | null> {
    const { data, error } = await this.db
      .from('messages')
      .update({ status: 'failed', error_code: HANDED_OFF, error_text: 'the admin is sending it from WhatsApp', next_attempt_at: null })
      .eq('id', id)
      .eq('direction', 'outbound')
      .in('status', ['queued', 'failed'])
      .or(NOT_CLAIMED)
      .select('*')
      .maybeSingle();
    if (error) throw new Error(`message hand-off failed: ${error.message}`);
    return data;
  }
}
