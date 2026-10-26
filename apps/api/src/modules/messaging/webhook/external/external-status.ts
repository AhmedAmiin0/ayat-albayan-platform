import { Inject, Injectable, Logger } from '@nestjs/common';
import type { EchoEvent, StatusEvent } from '../webhook.events';
import { ExternalStore } from './external.store';
import { KapsoHistory } from './kapso-history';
import { kapsoNumberFor } from './kapso-numbers';

/** The Kapso reader as a token, so tests swap in a fake (no call to Kapso from a test). */
export const KAPSO_HISTORY = Symbol('KAPSO_HISTORY');

const reason = (e: unknown): string => (e instanceof Error ? e.message : String(e)).slice(0, 200);

/**
 * A delivery status for a wamid we hold no row for, on a number whose driver is Kapso: staff sent
 * it from Kapso's own inbox. The message is read back from Kapso and stored as an outbound row with
 * WhatsApp's own time and this status (owner report 2026-10-26: replies showed under 4-day-old
 * messages). Never throws: a Kapso or database error is logged and the webhook still answers 200;
 * the catch-up job (external-catchup.job.ts) stores it within 10 minutes. Any other number: ignored.
 */
@Injectable()
export class ExternalStatus {
  private readonly log = new Logger(ExternalStatus.name);

  constructor(
    private readonly store: ExternalStore,
    @Inject(KAPSO_HISTORY) private readonly kapso: KapsoHistory,
  ) {}

  /** An smb_message_echoes item: its content is in the payload, so nothing is read from Kapso. */
  async echo({ message, ...from }: EchoEvent): Promise<void> {
    await this.store.store({ message, from });
  }

  /** True when a row for the wamid now exists (stored now, or by a concurrent run). */
  async adopt(e: StatusEvent): Promise<boolean> {
    const number = e.phoneNumberId ? kapsoNumberFor(e.phoneNumberId) : null;
    if (!number) return false;
    try {
      const message = await this.kapso.message(number.env, e.waMessageId);
      if (!message) return false;
      const from = { line: e.line ?? number.line, numberId: e.numberId ?? number.numberId, phoneNumberId: e.phoneNumberId };
      return (await this.store.store({ message, from, event: e })) !== 'skipped';
    } catch (err) {
      this.log.warn(`external message ${e.waMessageId} not stored (the catch-up job retries): ${reason(err)}`);
      return false;
    }
  }
}
