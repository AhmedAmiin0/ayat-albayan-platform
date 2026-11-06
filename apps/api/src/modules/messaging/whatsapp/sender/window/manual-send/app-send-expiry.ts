import { Injectable, Logger } from '@nestjs/common';
import { AppSendAdopt, type HeldRow } from './app-send-adopt';
import { AppSendExpiryRepo } from './app-send-expiry.repo';

/**
 * «أرسل عبر واتساب» with no echo attached (docs/19, review 2026-11-06): staff may have sent the
 * text from the app edited, from personal WhatsApp, or late. Once the tap's window and its grace
 * pass, each row first tries to adopt the app's message if it was stored as its own row (an echo
 * that landed while the tap was being written); else it is failed app_send_unconfirmed (never
 * auto-sent: the sender and the release skip any row with app_send_until set) and the bubble asks
 * «هل أرسلتها من واتساب؟». Runs at the start of every sender pass, before the release.
 */
@Injectable()
export class AppSendExpiry {
  private readonly log = new Logger('AppSendExpiry');

  constructor(
    private readonly repo: AppSendExpiryRepo,
    private readonly adopts: AppSendAdopt,
  ) {}

  /** The rows asked about now; throws on a read or write error (the caller skips the release). */
  async run(now: Date): Promise<number> {
    const rows = await this.repo.settled(now);
    const adopted = await Promise.all(rows.map((row) => this.adopted(row, now)));
    const open = rows.filter((_, i) => !adopted[i]).map((row) => row.id);
    const ids = await this.repo.expire(open, now);
    if (ids.length > 0) this.log.warn(`${ids.length} app send(s) unconfirmed: staff asked`);
    return ids.length;
  }

  /** Adopted; an adopt error leaves the row for the next pass (it stays blocked meanwhile). */
  private async adopted(row: HeldRow, now: Date): Promise<boolean> {
    try {
      return await this.adopts.adopt(row, now);
    } catch (e) {
      this.log.warn(`app send adopt failed for ${row.id}: ${String(e)}`);
      return true;
    }
  }
}
