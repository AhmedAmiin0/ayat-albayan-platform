import { AWAITING_REPLY, REOPEN_NOT_NEEDED } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import { SENDING } from '@/modules/messaging/whatsapp/sender/send-plan';

/** Not claimed by the sender (its claim writes SENDING): Meta may be sending a claimed one now. */
const NOT_CLAIMED = `error_code.is.null,error_code.neq.${SENDING}`;

const fail = (what: string, message: string): Error => new Error(`${what} failed: ${message}`);

/** The reopen rows' dedup keys of one phone: `reopen:<E.164>:<day>[:<try>]` (reopenDedupKey). */
const reopenKeys = (phone: string): string => `reopen:${phone}:%`;
/** A text that may still need the reopen: held for the reply, or claimed (it may be refused). */
const NEEDS_REOPEN = [AWAITING_REPLY, SENDING];

/** The reads and the compare-and-set of the reopen cancel (reopen-cancel.ts). */
@Injectable()
export class ReopenCancelRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

  /**
   * Is any other text to this family still queued that depends on the reopen: held for their
   * reply (AWAITING_REPLY) or claimed by the sender right now (SENDING, it may be refused for the
   * window and held)? Templates (a reminder, the reopen itself) and texts due anyway never count.
   */
  async othersPending(phone: string, except: string | null): Promise<boolean> {
    const query = this.db
      .from('messages')
      .select('id')
      .eq('phone_e164', phone)
      .eq('direction', 'outbound')
      .eq('status', 'queued')
      .is('template_key', null)
      .in('error_code', NEEDS_REOPEN);
    const { data, error } = await (except ? query.neq('id', except) : query).limit(1);
    if (error) throw fail('held messages read', error.message);
    return data.length > 0;
  }

  /**
   * This phone's reopen template rows still QUEUED and not claimed → failed REOPEN_NOT_NEEDED, in
   * one compare-and-set: a row the sender claimed, sent or failed meanwhile is never touched.
   * `only`: just the row of that dedup key (the one a missed hold queued).
   */
  async cancelQueued(phone: string, only: string | null): Promise<string[]> {
    const query = this.db
      .from('messages')
      .update({
        status: 'failed',
        error_code: REOPEN_NOT_NEEDED,
        error_text: 'no held text of this family needs the reply any more',
        next_attempt_at: null,
      })
      .eq('phone_e164', phone)
      .eq('direction', 'outbound')
      .like('dedup_key', reopenKeys(phone))
      .eq('status', 'queued')
      .or(NOT_CLAIMED);
    const { data, error } = await (only ? query.eq('dedup_key', only) : query).select('id');
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
