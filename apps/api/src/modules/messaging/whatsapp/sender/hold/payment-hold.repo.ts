import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import { SENDING } from '@/modules/messaging/whatsapp/sender/send-plan';
import { WA_PAYMENT_HOLD } from './payment-hold';

/** The line hold's one write: a row of a held line waits too, untried and uncounted. */
@Injectable()
export class PaymentHoldRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

  /**
   * Compare-and-set: still queued, not tried meanwhile (attempts) and never a claimed row (SENDING:
   * the worker asks the admin about it). The reason is written so the row shows why it waits.
   */
  async defer(input: { id: string; attempts: number; next: string; text: string }): Promise<void> {
    const { error } = await this.db
      .from('messages')
      .update({ next_attempt_at: input.next, error_code: WA_PAYMENT_HOLD, error_text: input.text })
      .eq('id', input.id)
      .eq('status', 'queued')
      .eq('attempts', input.attempts)
      .or(`error_code.is.null,error_code.neq.${SENDING}`);
    if (error) throw new Error(`payment hold write failed: ${error.message}`);
  }
}
