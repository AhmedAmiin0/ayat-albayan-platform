import { Inject, Injectable, Logger } from '@nestjs/common';
import { allowedRecipients, loadEnv, recipientAllowed } from '../../../../config/env/env';
import { SendGate } from '../../whatsapp/gate/send-gate';
import { WHATSAPP_LINES, type WhatsappLines } from '../../whatsapp/whatsapp.types';
import type { ReadMark } from './read-marks';
import { ThreadsQueries } from '../threads/threads.queries';

/** The stamp's outcome: whether a row was stamped, and the receipts going out in the background. */
interface ReadOpen {
  stamped: boolean;
  /** Never awaited by a request (tests await it); never rejects. */
  receipts: Promise<void>;
}

const tail = (phone: string) => `…${phone.slice(-4)}`;

/**
 * H2: opening a thread stamps its inbound rows read (unread = read_at null) and tells Meta the
 * newest one of each line was read, on that line's client (a wamid only works with the receiving
 * line's token, docs/12 §13.7). The receipt is an outbound call on a live number, so it goes out
 * only when the send gate is open (docs/12 §3.1) and the phone is on the allow-list (§13.5c); an
 * unconfigured line is skipped silently. The chat never waits on it (owner 2026-10-27: fire and
 * forget); failures are logged with the phone's last 4 digits, never shown to the admin.
 */
@Injectable()
export class ReadReceipts {
  private readonly log = new Logger(ReadReceipts.name);

  constructor(
    private readonly queries: ThreadsQueries,
    private readonly gate: SendGate,
    @Inject(WHATSAPP_LINES) private readonly lines: WhatsappLines,
  ) {}

  /** `upTo`: the newest row the caller shows; a row that arrives after it stays unread. */
  async open(phone: string, at: { now: Date; upTo?: string | undefined }): Promise<ReadOpen> {
    const marks = await this.queries.markInboundRead(phone, at.now, at.upTo);
    if (marks.length === 0) return { stamped: false, receipts: Promise.resolve() };
    return { stamped: true, receipts: this.notify(phone, marks) };
  }

  private async notify(phone: string, marks: readonly ReadMark[]): Promise<void> {
    try {
      if (!(await this.gate.open())) return;
      if (!recipientAllowed(allowedRecipients(loadEnv()), phone)) return;
      for (const mark of marks) await this.send(mark, phone);
    } catch (e) {
      this.log.warn(`read receipt skipped for ${tail(phone)}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  /** One line's receipt; its failure never stops the other line's. */
  private async send(mark: ReadMark, phone: string): Promise<void> {
    const client = this.lines[mark.line];
    if (!client.configured()) return;
    try {
      await client.markRead(mark.waMessageId);
    } catch (e) {
      const why = e instanceof Error ? e.message : String(e);
      this.log.warn(`read receipt failed on ${mark.line} for ${tail(phone)}: ${why}`);
    }
  }
}
