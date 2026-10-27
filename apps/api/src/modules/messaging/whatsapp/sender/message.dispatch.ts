import { baseMime, isReactionPayload, reactionRef, waSendKind, type TemplateDocument, type WaLine } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { BUCKETS, SIGNED_URL_SECONDS } from '../../../../common/storage/storage.paths';
import { StorageService } from '../../../../common/storage/storage.service';
import { allowedRecipients, loadEnv, recipientAllowed } from '../../../../config/env/env';
import { whatsappClient } from '../client-factory';
import { NumberClients } from '../numbers/number-clients';
import type { NumberRoute } from '../numbers/number-route';
import { quickReplyPayloads } from './send-plan';
import type { DueMessage } from './sender.queries';
import { isCallPermissionRequest } from '../messages/wa-call-permission';
import { templateButtons, templateParams } from '../messages/wa-json';
import { WaError, WHATSAPP_LINES, type TemplateRow, type WaSent, type WhatsappClient, type WhatsappLines } from '../whatsapp.types';

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
  if (!path.startsWith('out/') || path.split('/').includes('..')) throw new WaError(`media path ${path} is not a sent file`, { code: 100, status: 0 });
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

  /** Two lines in use: only then does the claim stamp `messages.line` (docs/12 §13.2). */
  get multi(): boolean {
    return this.lines.chat.configured();
  }

  async send(row: DueMessage, template: TemplateRow | null, via: SendVia): Promise<WaSent> {
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

  /** A file staff sent or forwarded from the chat: by link as its kind (waSendKind), its body as the caption, an ogg as a voice note. */
  private async sendFile(row: DueMessage, at: { via: SendVia; path: string }): Promise<WaSent> {
    const url = await mediaLink(this.storage, at.path);
    const kind = waSendKind(row.media_mime ?? null);
    const filename = row.media_name ?? undefined;
    // An ogg (a recorded note transcoded by the API, or a family's own forwarded) goes as a voice note.
    const voice = baseMime(row.media_mime ?? null) === 'audio/ogg';
    return this.client(at.via).sendDocument({ to: row.phone_e164, kind, url, filename, caption: row.body, replyTo: row.reply_to_wa_id, voice });
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
