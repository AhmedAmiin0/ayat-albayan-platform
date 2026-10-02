import { Inject, Injectable, Logger } from '@nestjs/common';
import { SendGate } from '../whatsapp/send-gate';
import { WHATSAPP_CLIENT, type WhatsappClient } from '../whatsapp/whatsapp.types';
import { ThreadsQueries } from './threads.queries';

/**
 * H2: opening a thread stamps its inbound rows read (unread = read_at null) and tells Meta the
 * newest one was read. The receipt is an outbound call on the live number, so it goes out only
 * when the send gate is open (docs/12 §3.1); failures are logged, never shown to the admin.
 */
@Injectable()
export class ReadReceipts {
  private readonly log = new Logger(ReadReceipts.name);

  constructor(
    private readonly queries: ThreadsQueries,
    private readonly gate: SendGate,
    @Inject(WHATSAPP_CLIENT) private readonly client: WhatsappClient,
  ) {}

  async open(phone: string, now: Date): Promise<void> {
    const newest = await this.queries.markInboundRead(phone, now);
    if (!newest || !(await this.gate.open())) return;
    try {
      await this.client.markRead(newest);
    } catch (e) {
      this.log.warn(`read receipt failed for ${newest}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
}
