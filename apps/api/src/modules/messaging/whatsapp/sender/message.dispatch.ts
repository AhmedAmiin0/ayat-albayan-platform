import { isReactionPayload, reactionRef, waSendKind } from '@ab/shared';
import type { WaLine } from '@ab/catalog';
import { Inject, Injectable } from '@nestjs/common';
import { StorageService } from '@/common/storage/storage.service';
import { allowedRecipients, loadEnv, recipientAllowed } from '@/config/env/env';
import { whatsappClient } from '@/modules/messaging/whatsapp/client-factory';
import { NumberClients } from '@/modules/messaging/whatsapp/numbers/number-clients';
import { evolutionAutoOff } from '@/modules/messaging/whatsapp/drivers/evolution/evolution.client';
import type { NumberRoute } from '@/modules/messaging/whatsapp/numbers/number-route';
import { quickReplyPayloads } from './send-plan';
import { documentLink, mediaLink } from './dispatch/send-links';
import { isVoiceOgg, sendVoiceById } from './voice/voice-dispatch';
import type { DueMessage } from './sender.repo';
import { isCallPermissionRequest } from '@/modules/messaging/whatsapp/messages/wa-call-permission';
import { templateButtons, templateParams } from '@/modules/messaging/whatsapp/messages/wa-json';
import { WaError, WHATSAPP_LINES, type TemplateRow, type WaSent, type WhatsappClient, type WhatsappLines } from '@/modules/messaging/whatsapp/whatsapp.types';

export { documentLink, mediaLink } from './dispatch/send-links';

/** Refuses every call before any request (WaError code null, status 0). */
const UNCONFIGURED = whatsappClient(null);

/** Where a row leaves from: a line (legacy: the two line clients) or a number (docs/23c). */
export type SendVia = WaLine | NumberRoute;

interface ReactionAt {
  via: SendVia;
  messageId: string;
  emoji: string | null;
}

const nothingToSend = (): WaError =>
  new WaError('nothing to send: no approved template and no text', { code: 100, status: 0 });

/** A job's row (no author) on a staff-only number (Evolution Baileys, docs/19): never sent. */
const jobOnStaffNumber = (row: DueMessage, client: WhatsappClient): boolean =>
  row.created_by === null && client.automaticOff?.() === true;

/** A quick reply's ref: the lesson, else the lead, else the message itself. */
const payloadRef = (row: DueMessage): string => row.lesson_id ?? row.lead_id ?? row.id;

/** Before the text branch: the permission request carries its text in body (docs/28). */
const asksCallPermission = (row: DueMessage): boolean =>
  Boolean(row.body) && isCallPermissionRequest(row.interactive_payload);

/**
 * Turns one queued row into one Graph call: a template, a session file (by link, its body as the
 * caption) or a session text (B2's inbox replies).
 * Two lines (docs/12 §13.3): both leave from `line` (lineOf: a template from its registry line, a
 * chat starter from chat; a text from the line it was stamped with). Module mode (docs/23c): the
 * number routing picked, through that number's own client (number-clients.ts).
 */
@Injectable()
export class MessageDispatch {
  /** WA_ALLOWED_RECIPIENTS (docs/12 §13.5b), read per call (the integration config may change). */
  get allowed(): readonly string[] | null {
    return allowedRecipients(loadEnv());
  }
  /** Module mode's per-number clients (in memory; legacy never asks them). */
  readonly numbers = new NumberClients();

  constructor(
    @Inject(WHATSAPP_LINES) private readonly lines: WhatsappLines,
    private readonly storage: StorageService,
  ) {}

  /** Checked before the claim: false leaves the row queued and untouched (no attempt, no call). */
  ready(row: DueMessage, via: SendVia): boolean {
    return this.client(via).configured() && recipientAllowed(this.allowed, row.phone_e164);
  }

  /** An Evolution Baileys number's pace for this row (docs/19); null = no pacing. */
  pace(row: DueMessage, via: SendVia): { waitMs: number; dailyCap: number; gapMs: number } | null {
    return this.client(via).pace?.(row.phone_e164) ?? null;
  }

  /** Two lines in use: only then does the claim stamp `messages.line` (docs/12 §13.2). */
  get multi(): boolean {
    return this.lines.chat.configured();
  }

  async send(row: DueMessage, template: TemplateRow | null, via: SendVia): Promise<WaSent> {
    const client = this.client(via);
    if (jobOnStaffNumber(row, client)) throw evolutionAutoOff();
    if (!row.template_key) return this.sendSession(row, via);
    if (!template) throw nothingToSend();
    const params = templateParams(row.template_params);
    const document = template.header_format === 'document' ? params.document : undefined;
    const documentUrl = await documentLink(this.storage, document);
    const ref = payloadRef(row);
    const payloads = quickReplyPayloads(templateButtons(template.buttons), { params, ref });
    return client.sendTemplate({ to: row.phone_e164, template, params, documentUrl, payloads });
  }

  /** A session row (no template): a call-permission request, a file or a text. */
  private sendSession(row: DueMessage, via: SendVia): Promise<WaSent> {
    if (asksCallPermission(row)) return this.sendCallPermission(row, via);
    // Before the text branch: a reaction's body is its emoji, never a text (migration 900).
    const reaction = reactionRef(row.interactive_payload);
    if (reaction) return this.sendReaction(row, { via, ...reaction });
    if (isReactionPayload(row.interactive_payload)) {
      throw new WaError('a reaction without a target message', { code: 100, status: 0 });
    }
    // Before the text branch: a captioned file must not go out as plain text.
    if (row.media_path) return this.sendFile(row, { via, path: row.media_path });
    if (!row.body) throw nothingToSend();
    const text = { to: row.phone_e164, text: row.body, replyTo: row.reply_to_wa_id };
    return this.client(via).sendText(text);
  }

  /** A chat file by link (waSendKind, body = caption); an ogg voice note by media id if it can. */
  private async sendFile(row: DueMessage, at: { via: SendVia; path: string }): Promise<WaSent> {
    const client = this.client(at.via);
    const voice = isVoiceOgg(row);
    const link = (path: string) => mediaLink(this.storage, path);
    const upload = voice ? client.voice?.() : null;
    const note = { row, path: at.path, client, storage: this.storage, link };
    if (upload) return sendVoiceById(note, upload);
    const url = await link(at.path);
    const kind = waSendKind(row.media_mime ?? null);
    const filename = row.media_name ?? undefined;
    const input = { to: row.phone_e164, kind, url, filename, caption: row.body, voice };
    return client.sendDocument({ ...input, replyTo: row.reply_to_wa_id });
  }

  private sendCallPermission(row: DueMessage, via: SendVia): Promise<WaSent> {
    const client = this.client(via);
    if (!client.sendCallPermissionRequest) {
      const info = { code: 100, status: 0 };
      throw new WaError('this line cannot send a call permission request', info);
    }
    return client.sendCallPermissionRequest({ to: row.phone_e164, text: row.body ?? '' });
  }

  /** A reaction through the line's driver; the CRM has none (refused before the queue). */
  private sendReaction(row: DueMessage, r: ReactionAt): Promise<WaSent> {
    const client = this.client(r.via);
    if (!client.sendReaction) {
      throw new WaError('this line cannot send a reaction', { code: 100, status: 0 });
    }
    return client.sendReaction({ to: row.phone_e164, messageId: r.messageId, emoji: r.emoji });
  }

  /** A line's client, or the number's own; a number that cannot send now refuses every call. */
  private client(via: SendVia): WhatsappClient {
    if (typeof via === 'string') return this.lines[via];
    return this.numbers.client(via.numberId) ?? UNCONFIGURED;
  }
}
