import {
  isReactionPayload, reactionRef, waSendKind, type TemplateDocument, type WaLine,
} from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { BUCKETS, isSentFilePath, SIGNED_URL_SECONDS } from '@/common/storage/storage.paths';
import { StorageService } from '@/common/storage/storage.service';
import { allowedRecipients, loadEnv, recipientAllowed } from '@/config/env/env';
import { whatsappClient } from '@/modules/messaging/whatsapp/client-factory';
import { NumberClients } from '@/modules/messaging/whatsapp/numbers/number-clients';
import { evolutionAutoOff } from '@/modules/messaging/whatsapp/drivers/evolution/evolution.client';
import type { NumberRoute } from '@/modules/messaging/whatsapp/numbers/number-route';
import { quickReplyPayloads } from './send-plan';
import { isVoiceOgg, sendVoiceById } from './voice/voice-dispatch';
import type { DueMessage } from './sender.repo';
import { isCallPermissionRequest } from '@/modules/messaging/whatsapp/messages/wa-call-permission';
import { templateButtons, templateParams } from '@/modules/messaging/whatsapp/messages/wa-json';
import { WaError, WHATSAPP_LINES, type TemplateRow, type WaSent, type WhatsappClient, type WhatsappLines } from '@/modules/messaging/whatsapp/whatsapp.types';

/** Refuses every call before any request (WaError code null, status 0). */
const UNCONFIGURED = whatsappClient(null);

/** Where a row leaves from: a line (legacy: today's two line clients) or a number (module mode, docs/23c). */
export type SendVia = WaLine | NumberRoute;

/**
 * A 7-day signed link to a report PDF (R-REP-03): WhatsApp fetches it after the send and the
 * guardian may open the wa.me fallback later. Only the reports bucket is ever signed here.
 */
export async function documentLink(storage: StorageService, doc: TemplateDocument | undefined): Promise<string | null> {
  if (!doc) return null;
  if (doc.bucket !== BUCKETS.reports) {
    throw new WaError(`document bucket ${doc.bucket} is not the reports bucket`, { code: 100, status: 0 });
  }
  const signed = await storage.signedDownload({ bucket: BUCKETS.reports, path: doc.path, seconds: SIGNED_URL_SECONDS.whatsapp });
  return signed.url;
}

/**
 * A 7-day signed link to a file staff sent from the chat (owner 2026-10-19 #2), signed again on
 * every try. Only wa-media paths under out/ are ever signed: never an inbound cache, never a report.
 */
export async function mediaLink(storage: StorageService, path: string): Promise<string> {
  if (!isSentFilePath(path)) throw new WaError(`media path ${path} is not a sent file`, { code: 100, status: 0 });
  const signed = await storage.signedDownload({ bucket: BUCKETS.waMedia, path, seconds: SIGNED_URL_SECONDS.whatsapp });
  return signed.url;
}

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

  /** Checked before the claim: false leaves the row queued and untouched (no attempt, no Meta call). */
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
    // A job's row (no author) on a staff-only number (Evolution Baileys, docs/19): never sent.
    if (row.created_by === null && this.client(via).automaticOff?.()) throw evolutionAutoOff();
    if (row.template_key && template) {
      const params = templateParams(row.template_params);
      const documentUrl = template.header_format === 'document' ? await documentLink(this.storage, params.document) : null;
      const ref = row.lesson_id ?? row.lead_id ?? row.id;
      return this.client(via).sendTemplate({
        to: row.phone_e164,
        template,
        params,
        documentUrl,
        payloads: quickReplyPayloads(templateButtons(template.buttons), { params, ref }),
      });
    }
    if (!row.template_key) return this.sendSession(row, via);
    throw new WaError('nothing to send: no approved template and no text', { code: 100, status: 0 });
  }

  /** A session row (no template): a call-permission request, a file or a text. */
  private sendSession(row: DueMessage, via: SendVia): Promise<WaSent> {
    // Before the text branch: «اطلب إذن الاتصال» carries its text in body (docs/28).
    if (row.body && isCallPermissionRequest(row.interactive_payload)) return this.sendCallPermission(row, via);
    // Before the text branch: a reaction's body is its emoji, never a text (migration 900).
    const reaction = reactionRef(row.interactive_payload);
    if (reaction) return this.sendReaction(row, { via, ...reaction });
    if (isReactionPayload(row.interactive_payload)) throw new WaError('a reaction without a target message', { code: 100, status: 0 });
    // Before the text branch: a captioned file must not go out as plain text.
    if (row.media_path) return this.sendFile(row, { via, path: row.media_path });
    if (row.body) return this.client(via).sendText({ to: row.phone_e164, text: row.body, replyTo: row.reply_to_wa_id });
    throw new WaError('nothing to send: no approved template and no text', { code: 100, status: 0 });
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
    if (!client.sendCallPermissionRequest) throw new WaError('this line cannot send a call permission request', { code: 100, status: 0 });
    return client.sendCallPermissionRequest({ to: row.phone_e164, text: row.body ?? '' });
  }

  /** A reaction through the line's driver; the CRM has none (the API refuses it before the queue, this is the backstop). */
  private sendReaction(row: DueMessage, r: { via: SendVia; messageId: string; emoji: string | null }): Promise<WaSent> {
    const client = this.client(r.via);
    if (!client.sendReaction) throw new WaError('this line cannot send a reaction', { code: 100, status: 0 });
    return client.sendReaction({ to: row.phone_e164, messageId: r.messageId, emoji: r.emoji });
  }

  /** A line's client, or the number's own; a number that cannot send now gets a client that refuses every call. */
  private client(via: SendVia): WhatsappClient {
    if (typeof via === 'string') return this.lines[via];
    return this.numbers.client(via.numberId) ?? UNCONFIGURED;
  }
}
