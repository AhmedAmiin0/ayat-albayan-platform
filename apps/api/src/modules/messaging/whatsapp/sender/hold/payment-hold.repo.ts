import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import { SENDING } from '@/modules/messaging/whatsapp/sender/send-plan';
import { PAYMENT_HOLD_MAX_AGE_MS, WA_PAYMENT_HOLD } from './payment-hold';
import { pgError } from '@/common/db/errors';

/** The lane hold's error_code; absent = the 131042 hold. */
interface Code {
  code?: string;
}
type DeferOne = { id: string; attempts: number; next: string; text: string } & Code;
type DeferMany = { ids: readonly string[]; next: string; text: string } & Code;

/** The lane holds' writes (131042, outage): rows of a held line wait too, untried and uncounted. */
@Injectable()
export class PaymentHoldRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

  /**
   * Compare-and-set: still queued, not tried meanwhile (attempts) and never a claimed row (SENDING:
   * the worker asks the admin about it). The reason is written so the row shows why it waits.
   */
  async defer(input: DeferOne): Promise<void> {
    const error_code = input.code ?? WA_PAYMENT_HOLD;
    const { error } = await this.db
      .from('messages')
      .update({ next_attempt_at: input.next, error_code, error_text: input.text })
      .eq('id', input.id)
      .eq('status', 'queued')
      .eq('attempts', input.attempts)
      .or(`error_code.is.null,error_code.neq.${SENDING}`);
    if (error) throw pgError(error);
  }

  /** The rest of a pass's rows of a held line, in ONE compare-and-set write (no claimed row). */
  async deferMany(input: DeferMany): Promise<void> {
    const error_code = input.code ?? WA_PAYMENT_HOLD;
    const { error } = await this.db
      .from('messages')
      .update({ next_attempt_at: input.next, error_code, error_text: input.text })
      .in('id', [...input.ids])
      .eq('status', 'queued')
      .or(`error_code.is.null,error_code.neq.${SENDING}`);
    if (error) throw pgError(error);
  }

  /**
   * The rows a hold deferred (next_attempt_at exactly one of `from`, still its code) move
   * to `to` in ONE write: a renewal (later) or a lift (now). A row that `to` would take past its
   * expiry or its 48 h stop is left: it comes due and the worker decides it alone.
   */
  async move(input: { from: readonly string[]; to: string } & Code): Promise<void> {
    const oldest = new Date(Date.parse(input.to) - PAYMENT_HOLD_MAX_AGE_MS).toISOString();
    const { error } = await this.db
      .from('messages')
      .update({ next_attempt_at: input.to })
      .in('next_attempt_at', [...input.from])
      .eq('status', 'queued')
      .eq('error_code', input.code ?? WA_PAYMENT_HOLD)
      .or(`expires_at.is.null,expires_at.gte.${input.to}`)
      .or(`scheduled_for.gte.${oldest},and(scheduled_for.is.null,created_at.gte.${oldest})`);
    if (error) throw pgError(error);
  }
}
