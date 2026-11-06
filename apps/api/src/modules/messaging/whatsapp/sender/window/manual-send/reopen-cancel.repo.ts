import { REOPEN_NOT_NEEDED } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import { SENDING } from '@/modules/messaging/whatsapp/sender/send-plan';

/** Not claimed by the sender (its claim writes SENDING): Meta may be sending a claimed one now. */
const NOT_CLAIMED = `error_code.is.null,error_code.neq.${SENDING}`;

const fail = (what: string, message: string): Error => new Error(`${what} failed: ${message}`);

/** The reopen rows' dedup keys of one phone: `reopen:<E.164>:<day>[:<try>]` (reopenDedupKey). */
const reopenKeys = (phone: string): string => `reopen:${phone}:%`;
/** Not a reopen template row (its dedup key, if any, is not `reopen:…`). */
const NOT_REOPEN = 'dedup_key.is.null,dedup_key.not.like.reopen:*';

/** The reads and the compare-and-set of the reopen cancel (reopen-cancel.ts). */
@Injectable()
export class ReopenCancelRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

  /**
   * Is any other message to this family still queued (held for their reply, claimed by the sender
   * right now, or waiting its turn)? Any of them may need the reopen: it is kept.
   */
  async othersPending(phone: string, except: string): Promise<boolean> {
    const { data, error } = await this.db
      .from('messages')
      .select('id')
      .eq('phone_e164', phone)
      .eq('direction', 'outbound')
      .eq('status', 'queued')
      .or(NOT_REOPEN)
      .neq('id', except)
      .limit(1);
    if (error) throw fail('held messages read', error.message);
    return data.length > 0;
  }

  /**
   * This phone's reopen template rows still QUEUED and not claimed → failed REOPEN_NOT_NEEDED, in
   * one compare-and-set: a row the sender claimed, sent or failed meanwhile is never touched.
   */
  async cancelQueued(phone: string): Promise<string[]> {
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
    return data.map((r) => r.id);
  }

  /** Back to queued: these cancelled rows (still failed REOPEN_NOT_NEEDED, compare-and-set). */
  async restore(ids: readonly string[]): Promise<number> {
    const { data, error } = await this.db
      .from('messages')
      .update({ status: 'queued', error_code: null, error_text: null })
      .in('id', [...ids])
      .eq('status', 'failed')
      .eq('error_code', REOPEN_NOT_NEEDED)
      .select('id');
    if (error) throw fail('reopen restore', error.message);
    return data.length;
  }
}
