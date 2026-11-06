import { AWAITING_REPLY, REOPEN_NOT_NEEDED } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import { SENDING } from '@/modules/messaging/whatsapp/sender/send-plan';

/** Not claimed by the sender (its claim writes SENDING): Meta may be sending a claimed one now. */
const NOT_CLAIMED = `error_code.is.null,error_code.neq.${SENDING}`;

const fail = (what: string, message: string): Error => new Error(`${what} failed: ${message}`);

/** The reopen rows' dedup keys of one phone: `reopen:<E.164>:<day>[:<try>]` (reopenDedupKey). */
const reopenKeys = (phone: string): string => `reopen:${phone}:%`;

/** The reads and the compare-and-set of the reopen cancel (reopen-cancel.ts). */
@Injectable()
export class ReopenCancelRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** Does any other text still wait for this family's reply (queued AWAITING_REPLY)? */
  async othersHeld(phone: string, except: string): Promise<boolean> {
    const { data, error } = await this.db
      .from('messages')
      .select('id')
      .eq('phone_e164', phone)
      .eq('direction', 'outbound')
      .eq('status', 'queued')
      .eq('error_code', AWAITING_REPLY)
      .neq('id', except)
      .limit(1);
    if (error) throw fail('held messages read', error.message);
    return data.length > 0;
  }

  /**
   * This phone's reopen template rows still QUEUED and not claimed → failed REOPEN_NOT_NEEDED, in
   * one compare-and-set: a row the sender claimed, sent or failed meanwhile is never touched.
   */
  async cancelQueued(phone: string): Promise<number> {
    const { data, error } = await this.db
      .from('messages')
      .update({
        status: 'failed',
        error_code: REOPEN_NOT_NEEDED,
        error_text: 'staff sent the held text from WhatsApp, so no reply needs asking for',
        next_attempt_at: null,
      })
      .eq('phone_e164', phone)
      .eq('direction', 'outbound')
      .like('dedup_key', reopenKeys(phone))
      .eq('status', 'queued')
      .or(NOT_CLAIMED)
      .select('id');
    if (error) throw fail('reopen cancel', error.message);
    return data.length;
  }
}
