import { ACCOUNT_CODE_TEMPLATE, isHiddenPayload, type NumberPurpose, waIdToE164 } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { orderedAt } from '@/modules/messaging/webhook/inbound/webhook.inbound';
import type { StatusEvent } from '@/modules/messaging/webhook/webhook.events';
import { WebhookQueries } from '@/modules/messaging/webhook/webhook.queries';
import { externalMessage, type ExternalMessage } from './external-message';
import { externalRow } from './external-row';
import { ExternalQueries } from './external.queries';

interface ExternalInput {
  /** Meta's message object (an echo, or an item of Kapso's history). */
  message: unknown;
  from: { line: NumberPurpose | null; numberId?: string | null; phoneNumberId?: string | null };
  /** The delivery status that revealed it (webhook); none for an echo or the catch-up job. */
  event?: StatusEvent;
}

/** stored = a new row; known = the wamid was already there; skipped = not an outbound message we can read. */
export type ExternalOutcome = 'stored' | 'known' | 'skipped';

/** An outbound message we can read, with its customer's E.164 phone; null otherwise. */
function outboundOf(message: unknown): { msg: ExternalMessage; phone: string } | null {
  const msg = externalMessage(message);
  if (!msg || (msg.direction !== null && msg.direction !== 'outbound')) return null;
  const phone = waIdToE164(msg.to);
  return phone ? { msg, phone } : null;
}

/**
 * Stores one message sent outside the app as an outbound row (external-row.ts), linked to the
 * guardian or lead of the phone (never creating a lead). Idempotent on wa_message_id: re-checked
 * before the insert, and the insert does nothing on conflict; never while our own send to the phone
 * is unrecorded (ExternalQueries.inFlight). A new row answers the chat: the phone's earlier unread
 * inbound rows are stamped read (as WhatsApp does on the phone). No other side effect: no send, no
 * read receipt, no push, no automation (only the inbound path runs those).
 */
@Injectable()
export class ExternalStore {
  constructor(
    private readonly queries: ExternalQueries,
    private readonly webhook: WebhookQueries,
  ) {}

  async store({ message, from, event }: ExternalInput): Promise<ExternalOutcome> {
    const read = outboundOf(message);
    if (!read) return 'skipped';
    const { msg, phone } = read;
    if ((await this.queries.existing([msg.waMessageId])).size > 0) return 'known';
    if (await this.queries.inFlight(phone)) return 'skipped';
    const numberId = from.numberId ?? (from.phoneNumberId ? await this.webhook.numberIdFor(from.phoneNumberId) : null);
    const who = await this.webhook.identify(phone);
    const at = orderedAt(msg.at, await this.webhook.latestInSecond(phone, msg.at));
    const row = externalRow({ msg, phone, who, from: { line: from.line, numberId }, at, ...(event ? { event } : {}) });
    if (!(await this.queries.insert(row))) return 'known';
    // An edit, revoke or reaction is no reply (a marker, migration 992): unread stays as it is.
    const marker = isHiddenPayload(row.interactive_payload);
    if (row.template_key !== ACCOUNT_CODE_TEMPLATE && !marker) await this.answered(phone, at);
    return 'stored';
  }

  /**
   * Stamps the inbound rows before the reply's second read at the reply's time (now when that is
   * ahead). WhatsApp times are whole seconds and orderedAt orders within one by arrival, so a family
   * message of the same second may be newer than the reply: it stays unread. Our sign-in code
   * (CodeSend: no row, so Kapso's status adopts it here) is never a reply.
   */
  private async answered(phone: string, at: Date): Promise<void> {
    const now = new Date();
    const second = new Date(Math.floor(at.getTime() / 1000) * 1000);
    await this.queries.markAnsweredRead(phone, second, at > now ? now : at);
  }
}
