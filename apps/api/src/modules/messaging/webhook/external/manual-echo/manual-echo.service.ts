import { Injectable } from '@nestjs/common';
import type { ExternalMessage } from '@/modules/messaging/webhook/external/external-message';
import { type EchoOrigin, manualMatches, markSpan } from './manual-echo';
import { ManualEchoRepo } from './manual-echo.repo';

/** The echo as the attach reads it: the message, its customer's E.164 phone, where it came from. */
interface EchoInput {
  msg: ExternalMessage;
  phone: string;
  from: EchoOrigin;
}

/** Plain text only (v1): no template, no file, no marker (edit, revoke, reaction). */
const plainText = (msg: ExternalMessage): msg is ExternalMessage & { body: string } =>
  msg.body !== null && msg.templateName === null && msg.mediaId === null && msg.payload === null;

/**
 * «أرسل عبر واتساب» (owner 2026-11-06): the app's echo of a text staff marked sent_manually takes
 * that row (its wamid, so WhatsApp's later statuses move it) instead of a second bubble. true =
 * attached; false = no such row (or another echo took it): the caller stores it as today.
 */
@Injectable()
export class ManualEcho {
  constructor(private readonly repo: ManualEchoRepo) {}

  async attach({ msg, phone, from }: EchoInput): Promise<boolean> {
    if (!plainText(msg)) return false;
    const rows = await this.repo.candidates(phone, markSpan(msg.at));
    for (const row of manualMatches(rows, { body: msg.body, from })) {
      const at = new Date(Math.max(msg.at.getTime(), Date.parse(row.sent_manually_at ?? '') || 0));
      const write = { id: row.id, from: row.wa_message_id, waMessageId: msg.waMessageId, at };
      if (await this.repo.attach(write)) return true;
    }
    return false;
  }
}
