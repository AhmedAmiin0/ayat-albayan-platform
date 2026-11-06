import { Injectable } from '@nestjs/common';
import type { ExternalMessage } from '@/modules/messaging/webhook/external/external-message';
import type { StatusEvent } from '@/modules/messaging/webhook/webhook.events';
import { ReopenCancel } from '@/modules/messaging/whatsapp';
import {
  type AppSendRow,
  appSendMatches,
  appSendSpan,
  attachPatch,
  type EchoOrigin,
} from './manual-echo';
import { ManualEchoRepo } from './manual-echo.repo';

/** An external outbound message as the attach reads it: its customer's phone, origin, status. */
interface ExternalInput {
  msg: ExternalMessage;
  phone: string;
  from: EchoOrigin;
  /** Kapso's status that revealed it; none for an echo or the catch-up job (sent). */
  event?: StatusEvent | undefined;
}

/** Plain text only (v1): no template, no file, no marker (edit, revoke, reaction). */
const plainText = (msg: ExternalMessage): msg is ExternalMessage & { body: string } =>
  msg.body !== null && msg.templateName === null && msg.mediaId === null && msg.payload === null;

/**
 * «أرسل عبر واتساب» (owner 2026-11-06, docs/19): an external outbound text confirms the row staff
 * tapped (its wamid and status, so WhatsApp's later statuses move it) instead of a second bubble,
 * and the family's queued reopen template goes when no other text waits (ReopenCancel). true =
 * attached; false = no such row (or another message took it): the caller stores it as today.
 */
@Injectable()
export class ManualEcho {
  constructor(
    private readonly repo: ManualEchoRepo,
    private readonly reopens: ReopenCancel,
  ) {}

  async attach({ msg, phone, from, event }: ExternalInput): Promise<boolean> {
    const patch = attachPatch(msg.at, event);
    if (!plainText(msg) || patch === null) return false;
    const rows = await this.repo.candidates(phone, appSendSpan(msg.at));
    for (const row of appSendMatches(rows, { body: msg.body, from })) {
      const write = { row, waMessageId: msg.waMessageId, patch };
      if (await this.repo.attach(write)) return this.confirmed(row, phone);
    }
    return false;
  }

  private async confirmed(row: AppSendRow, phone: string): Promise<boolean> {
    await this.reopens.afterAttach({ id: row.id, phone_e164: phone });
    return true;
  }
}
