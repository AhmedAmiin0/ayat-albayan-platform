import { AWAITING_REPLY } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import { MESSAGE_SELECT, type ThreadMessageRow } from './message.mapper';
import { stampDelivered } from './delivered';
import { HANDED_OFF, SENDING } from '@/modules/messaging/whatsapp/sender/send-plan';

/** Not while the sender holds the row (its claim): Meta may be sending it right now. */
const NOT_CLAIMED = `error_code.is.null,error_code.neq.${SENDING}`;
/** No next try and no error: due now. */
const CLEAR = { next_attempt_at: null, error_code: null, error_text: null } as const;

const heldAgain = (at: Date) =>
  ({ error_code: AWAITING_REPLY, scheduled_for: at.toISOString(), expires_at: null }) as const;

/**
 * M1–M3 (docs/12 §4): the admin's retry, «I sent it myself» and the hand-off, all compare-and-set.
 * M2/M3 also skip a row the sender claimed between the admin's read and this write.
 */
@Injectable()
export class MessagesRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

  async get(id: string): Promise<ThreadMessageRow | null> {
    const { data, error } = await this.db.from('messages').select(MESSAGE_SELECT).eq('id', id).maybeSingle();
    if (error) throw new Error(`message read failed: ${error.message}`);
    return data;
  }

  /**
   * failed → queued with a fresh attempt budget; null when it is no longer failed, or it was never
   * ours to send: a message sent outside the app or imported (created_by null, attempts 0, a wamid).
   * `restart` (a held text's retry): held again (AWAITING_REPLY, never tried as free text), its
   * 7 days from then (scheduled_for), no old deadline.
   */
  async requeue(id: string, restart: Date | null = null): Promise<ThreadMessageRow | null> {
    const fresh = restart ? heldAgain(restart) : {};
    const { data, error } = await this.db
      .from('messages')
      .update({ status: 'queued', attempts: 0, next_attempt_at: null, error_code: null, error_text: null, ...fresh })
      .eq('id', id)
      .eq('status', 'failed')
      .or('attempts.gt.0,wa_message_id.is.null,created_by.not.is.null')
      .select(MESSAGE_SELECT)
      .maybeSingle();
    if (error) throw new Error(`message retry failed: ${error.message}`);
    return data;
  }

  /**
   * Outbound queued / failed → sent_manually (R-MSG-03): the sender never sends it again. The
   * delivery side effects follow (lead last_outbound_at, report sent_at).
   */
  async markSentManually(id: string, at: Date): Promise<ThreadMessageRow | null> {
    const stamp = at.toISOString();
    const { data, error } = await this.db
      .from('messages')
      .update({ status: 'sent_manually', sent_manually_at: stamp, next_attempt_at: null, error_code: null, error_text: null })
      .eq('id', id)
      .eq('direction', 'outbound')
      .in('status', ['queued', 'failed'])
      .or(NOT_CLAIMED)
      .select(MESSAGE_SELECT)
      .maybeSingle();
    if (error) throw new Error(`message manual send failed: ${error.message}`);
    if (data) await stampDelivered(this.db, { leadId: data.lead_id, dedupKey: data.dedup_key, at: stamp });
    return data;
  }

  /**
   * M3: the admin opened wa.me to send it from their own WhatsApp. Held as failed «handed_off»
   * (the sender never reads failed rows) until they confirm (M2) or put it back (M1).
   */
  async handOff(id: string): Promise<ThreadMessageRow | null> {
    const { data, error } = await this.db
      .from('messages')
      .update({ status: 'failed', error_code: HANDED_OFF, error_text: 'the admin is sending it from WhatsApp', next_attempt_at: null })
      .eq('id', id)
      .eq('direction', 'outbound')
      .in('status', ['queued', 'failed'])
      .or(NOT_CLAIMED)
      .select(MESSAGE_SELECT)
      .maybeSingle();
    if (error) throw new Error(`message hand-off failed: ${error.message}`);
    return data;
  }

  /**
   * «تراجع» of «أرسل عبر واتساب» (WhatsApp did not open): sent_manually → queued, a fresh attempt
   * budget, compare-and-set on a staff row still holding the wamid it was read with (no app echo
   * attached since), marked since `since`. The sender then sends it, or holds it again.
   */
  async unsend(id: string, at: { since: Date; wamid: string | null }): Promise<ThreadMessageRow | null> {
    const query = this.db
      .from('messages')
      .update({ status: 'queued', sent_manually_at: null, attempts: 0, ...CLEAR })
      .eq('id', id)
      .eq('direction', 'outbound')
      .eq('status', 'sent_manually')
      .not('created_by', 'is', null)
      .gte('sent_manually_at', at.since.toISOString());
    const same = at.wamid === null ? query.is('wa_message_id', null) : query.eq('wa_message_id', at.wamid);
    const { data, error } = await same.select(MESSAGE_SELECT).maybeSingle();
    if (error) throw new Error(`message undo failed: ${error.message}`);
    return data;
  }
}
