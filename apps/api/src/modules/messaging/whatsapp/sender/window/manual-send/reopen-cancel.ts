import { stoppedByWindow } from '@ab/shared';
import { Injectable, Logger } from '@nestjs/common';
import type { Tables } from '@ab/db';
import { ReopenCancelRepo } from './reopen-cancel.repo';

/** The row as it was before staff marked it sent from WhatsApp. */
export type ManualBefore = Pick<Tables<'messages'>, 'id' | 'phone_e164' | 'status' | 'error_code'>;

/** cancelled: n queued reopens stopped; kept: another text waits; none: not a held text. */
export type CancelOutcome = { cancelled: number } | 'kept' | 'none';

const last4 = (phone: string): string => `…${phone.slice(-4)}`;
const messageOf = (e: unknown): string => (e instanceof Error ? e.message : String(e));

/**
 * «أرسل عبر واتساب» (owner 2026-11-06): once staff sent a held text from WhatsApp themselves and no
 * other text waits for that family, the reopen template still queued for them is not needed: it is
 * cancelled (compare-and-set: one the sender claimed, sent or failed is never touched). Never
 * throws: the manual send already stands; a template left queued only asks the family to reply.
 */
@Injectable()
export class ReopenCancel {
  private readonly log = new Logger('ReopenCancel');

  constructor(private readonly repo: ReopenCancelRepo) {}

  async afterManualSend(before: ManualBefore): Promise<CancelOutcome> {
    if (!stoppedByWindow(before)) return 'none';
    try {
      return await this.cancel(before);
    } catch (e) {
      this.log.warn(`reopen cancel failed for ${last4(before.phone_e164)}: ${messageOf(e)}`);
      return 'kept';
    }
  }

  private async cancel(before: ManualBefore): Promise<CancelOutcome> {
    const phone = before.phone_e164;
    if (await this.repo.othersHeld(phone, before.id)) return 'kept';
    const cancelled = await this.repo.cancelQueued(phone);
    if (cancelled > 0) this.log.log(`reopen template cancelled for ${last4(phone)}: sent from WhatsApp`);
    return { cancelled };
  }
}
