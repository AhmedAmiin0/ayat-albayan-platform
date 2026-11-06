import { Injectable, Logger } from '@nestjs/common';
import { ReopenCancelRepo } from './reopen-cancel.repo';

/** cancelled: n queued reopens stopped; kept: another text of the family still waits. */
export type CancelOutcome = { cancelled: number } | 'kept';

/** The row whose send made the reopen unneeded (its own id is not «another text»). */
export interface SentRow {
  id: string;
  phone_e164: string;
}

/** The phone in a log line: its last 4 digits only. */
const masked = (phone: string): string => `…${phone.slice(-4)}`;

/**
 * The reopen template a family no longer needs (owner 2026-11-06, docs/19): one still QUEUED and
 * not claimed is failed REOPEN_NOT_NEEDED in a compare-and-set (a sending, sent or failed one is
 * never touched), and only while no other text of that family is queued. Never throws: a template
 * left queued only asks the family to reply.
 */
@Injectable()
export class ReopenCancel {
  private readonly log = new Logger('ReopenCancel');

  constructor(private readonly repo: ReopenCancelRepo) {}

  /** The app's echo confirmed a «أرسل عبر واتساب» text (ManualEcho): its reopen is not needed. */
  async afterAttach(row: SentRow): Promise<CancelOutcome> {
    return this.safely(row.phone_e164, () => this.cancel(row));
  }

  /**
   * The hold missed after ReopenRequest queued `key` for it (the row moved meanwhile, review
   * 2026-11-06): that reopen goes too, unless a text of the family is still queued (even this one,
   * held by another pass).
   */
  async dropLost(phone: string, key: string): Promise<CancelOutcome> {
    return this.safely(phone, async () => {
      const pending = () => this.repo.othersPending(phone, null);
      if (await pending()) return 'kept';
      const ids = await this.repo.cancelQueued(phone, key);
      return ids.length > 0 && (await pending()) ? this.restore(ids) : { cancelled: ids.length };
    });
  }

  private async safely(phone: string, run: () => Promise<CancelOutcome>): Promise<CancelOutcome> {
    try {
      return await run();
    } catch (e) {
      this.log.warn(`reopen cancel failed for ${masked(phone)}: ${String(e)}`);
      return 'kept';
    }
  }

  /**
   * Kept while another message to the family is queued. Re-read after the cancel: one queued
   * meanwhile (it may count on this reopen: ReopenRequest saw it live) gets the reopen back.
   */
  private async cancel(row: SentRow): Promise<CancelOutcome> {
    const phone = row.phone_e164;
    const pending = () => this.repo.othersPending(phone, row.id);
    if (await pending()) return 'kept';
    const ids = await this.repo.cancelQueued(phone, null);
    if (ids.length > 0 && (await pending())) return this.restore(ids);
    if (ids.length > 0) this.log.log(`reopen template cancelled for ${masked(phone)}: app send`);
    return { cancelled: ids.length };
  }

  private async restore(ids: readonly string[]): Promise<CancelOutcome> {
    await this.repo.restore(ids);
    return 'kept';
  }
}
