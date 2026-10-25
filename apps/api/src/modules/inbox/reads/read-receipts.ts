import { Inject, Injectable, Logger } from '@nestjs/common';
import { allowedRecipients, loadEnv, recipientAllowed } from '../../../config/env/env';
import { SendGate } from '../../whatsapp/gate/send-gate';
import { WHATSAPP_LINES, type WhatsappLines } from '../../whatsapp/whatsapp.types';
import type { ReadMark } from './read-marks';
import { ThreadsQueries } from '../threads/threads.queries';

/**
 * H2: opening a thread stamps its inbound rows read (unread = read_at null) and tells Meta the
 * newest one of each line was read, on that line's client (a wamid only works with the receiving
 * line's token, docs/12 §13.7). The receipt is an outbound call on a live number, so it goes out
 * only when the send gate is open (docs/12 §3.1) and the phone is on the allow-list (§13.5c); an
 * unconfigured line is skipped silently. Failures are logged, never shown to the admin.
 */
@Injectable()
export class ReadReceipts {
  private readonly log = new Logger(ReadReceipts.name);

  constructor(
    private readonly queries: ThreadsQueries,
    private readonly gate: SendGate,
    @Inject(WHATSAPP_LINES) private readonly lines: WhatsappLines,
  ) {}

  async open(phone: string, now: Date): Promise<void> {
    const marks = await this.queries.markInboundRead(phone, now);
    if (marks.length === 0) return;
    if (!(await this.gate.open())) return;
    if (!recipientAllowed(allowedRecipients(loadEnv()), phone)) return;
    for (const mark of marks) await this.send(mark);
  }

  /** One line's receipt; its failure never stops the other line's. */
  private async send(mark: ReadMark): Promise<void> {
    const client = this.lines[mark.line];
    if (!client.configured()) return;
    try {
      await client.markRead(mark.waMessageId);
    } catch (e) {
      const why = e instanceof Error ? e.message : String(e);
      this.log.warn(`read receipt failed on ${mark.line} for ${mark.waMessageId}: ${why}`);
    }
  }
}
