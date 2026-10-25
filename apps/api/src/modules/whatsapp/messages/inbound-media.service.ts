import { INVOICE_MIMES, baseMime, chatFileMaxBytes, isWaAuthError } from '@ab/shared';
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { BUCKETS, waMediaPath } from '../../../common/storage/storage.paths';
import { StorageService } from '../../../common/storage/storage.service';
import { InboundMediaQueries, type MediaMessage } from './inbound-media.queries';
import { KAPSO_AUTH } from '../sender/send-plan';
import { waHttpError } from '../template.mapper';
import { WHATSAPP_LINES, WaError, type WhatsappLines } from '../whatsapp.types';

/** 409 for inbound media on a crm line: the CRM holds that number's files (docs/19). */
export const CRM_NO_MEDIA = 'crm_no_media';

/** Meta keeps a media id about 30 days; a day less, so a download never races the deadline. */
export const MEDIA_FETCH_DAYS = 29;
const DAY_MS = 86_400_000;

export type InboundFile = { bucket: typeof BUCKETS.waMedia; path: string; mime: string };

/** «image/jpeg; codecs=…» → «image/jpeg» (shared since owner 2026-10-19 #1). */
export { baseMime };
export const isInvoiceMime = (mime: string | null): boolean => (INVOICE_MIMES as readonly string[]).includes(baseMime(mime));

/**
 * The gate of a file we may serve: inbound, with a media id, and a mime `allow` accepts. The default
 * (images / PDFs) keeps the booking's «من الشات» and the sales receipt copy narrow; the chat bubble
 * (W6) passes isChatViewMime for voice notes and videos too (owner 2026-10-19 #1).
 */
export function servable(msg: MediaMessage, allow: (mime: string | null) => boolean = isInvoiceMime): MediaMessage {
  if (msg.direction !== 'inbound' || !msg.media_id || !allow(msg.media_mime)) {
    throw waHttpError('invoice_message', HttpStatus.BAD_REQUEST);
  }
  return msg;
}

/** Older than WhatsApp keeps the file (and never cached by us): it cannot be fetched any more. */
export function mediaExpired(msg: Pick<MediaMessage, 'created_at' | 'media_path'>, now: Date): boolean {
  return msg.media_path === null && now.getTime() - Date.parse(msg.created_at) > MEDIA_FETCH_DAYS * DAY_MS;
}

/**
 * An inbound WhatsApp file (image / PDF; audio / video for the chat bubble) as a file we own
 * (R-MSG-06). The webhook stores only Meta's media id, so the first time an admin needs the file (a thumbnail, «من الشات» on a booking) it is
 * fetched from Meta and cached in the private `wa-media` bucket; later calls read the cache.
 * 404 message_not_found, 400 invoice_message (not inbound, or not an image / PDF), 410 media_expired
 * (older than 29 days, or Meta refuses the id), 413 invoice_too_large (chatFileMaxBytes). The file is fetched with the
 * RECEIVING line's client (docs/12 §13.4): 503 line_not_configured for a chat message while the chat
 * line is not configured, 502 meta_error when Meta refuses the line's token (190 / 10 / 200),
 * 502 kapso_auth when Kapso refuses the project key (docs/19).
 */
@Injectable()
export class InboundMedia {
  constructor(
    private readonly queries: InboundMediaQueries,
    @Inject(WHATSAPP_LINES) private readonly lines: WhatsappLines,
    private readonly storage: StorageService,
  ) {}

  /** The message, checked to be a file we can serve; the caller checks it belongs to the right chat. */
  async load(messageId: string, allow: (mime: string | null) => boolean = isInvoiceMime): Promise<MediaMessage> {
    const msg = await this.queries.message(messageId);
    if (!msg) throw waHttpError('message_not_found', HttpStatus.NOT_FOUND);
    return servable(msg, allow);
  }

  async ensure(messageId: string): Promise<InboundFile> {
    return this.cache(await this.load(messageId));
  }

  /** The cached object of a loaded message, downloading it first (cap: 16 MB audio/video, else 10 MB). */
  async cache(msg: MediaMessage): Promise<InboundFile> {
    const mime = baseMime(msg.media_mime);
    if (msg.media_path) return { bucket: BUCKETS.waMedia, path: msg.media_path, mime };
    if (mediaExpired(msg, new Date()) || !msg.media_id) throw waHttpError('media_expired', HttpStatus.GONE);
    const file = await this.download(msg, msg.media_id);
    if (file.bytes.byteLength > chatFileMaxBytes(mime)) {
      throw waHttpError('invoice_too_large', HttpStatus.PAYLOAD_TOO_LARGE);
    }
    const path = waMediaPath({ messageId: msg.id, mime });
    await this.storage.upload({ bucket: BUCKETS.waMedia, path, body: file.bytes, contentType: mime });
    await this.queries.setPath(msg.id, path);
    return { bucket: BUCKETS.waMedia, path, mime };
  }

  /** A Meta 4xx means the id is gone (expired, deleted): 410, not a server error; a dead token is 502. */
  private async download(msg: MediaMessage, mediaId: string): Promise<{ bytes: Uint8Array }> {
    const client = this.lines[msg.line ?? 'notifications'];
    if (msg.line === 'chat' && !client.configured()) throw waHttpError('line_not_configured', HttpStatus.SERVICE_UNAVAILABLE);
    try {
      return await client.getMedia(mediaId);
    } catch (e) {
      throw e instanceof WaError ? mediaHttpError(e) : e;
    }
  }
}

/** A failed media fetch in words: crm_no_media, kapso_auth, a dead Meta token, or gone (410); else as is. */
function mediaHttpError(e: WaError): Error {
  // The crm driver cannot fetch Meta media: that number's files are in the CRM (docs/19).
  if (e.info.unsupported === 'crm') return waHttpError(CRM_NO_MEDIA, HttpStatus.CONFLICT);
  if (e.info.credential === 'kapso') return waHttpError(KAPSO_AUTH, HttpStatus.BAD_GATEWAY);
  if (isWaAuthError(e.info.code)) return waHttpError('meta_error', HttpStatus.BAD_GATEWAY, { meta_code: e.info.code });
  if (e.info.status >= 400 && e.info.status < 500) return waHttpError('media_expired', HttpStatus.GONE);
  return e;
}
