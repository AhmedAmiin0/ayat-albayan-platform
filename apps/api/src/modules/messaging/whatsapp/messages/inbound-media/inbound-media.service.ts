import { baseMime, chatFileMaxBytes, isChatViewMime } from '@ab/shared';
import { INVOICE_MIMES } from '@ab/schedule';
import { HttpStatus, Inject, Injectable, Optional } from '@nestjs/common';
import { BUCKETS, waMediaPath } from '@/common/storage/storage.paths';
import { StorageService } from '@/common/storage/storage.service';
import { CrmHistoryMedia } from '@/modules/messaging/whatsapp/messages/crm-history/crm-history-media';
import { isCrmHistoryRow } from '@/modules/messaging/whatsapp/messages/crm-history/crm-history-url';
import { InboundMediaRepo, type MediaMessage } from './inbound-media.repo';
import { keepingRefusal, rejectStored, withinCap } from '@/modules/messaging/whatsapp/messages/media-refusal/media-refusal';
import { mediaSource } from '@/modules/messaging/whatsapp/numbers/media-client';
import { NumberClients } from '@/modules/messaging/whatsapp/numbers/number-clients';
import { CRM_NO_MEDIA, mediaHttpError } from '@/modules/messaging/whatsapp/drivers/media-errors';
import { WHATSAPP_LINES, WaError, type WhatsappLines } from '@/modules/messaging/whatsapp/whatsapp.types';
import { httpError } from '@/common/http/errors';

export { CRM_NO_MEDIA };

/** Meta keeps a media id about 30 days; a day less, so a download never races the deadline. */
export const MEDIA_FETCH_DAYS = 29;
const DAY_MS = 86_400_000;

export interface InboundFile { bucket: typeof BUCKETS.waMedia; path: string; mime: string }

/** «image/jpeg; codecs=…» → «image/jpeg» (shared). */
export { baseMime };
const isInvoiceMime = (mime: string | null): boolean => (INVOICE_MIMES as readonly string[]).includes(baseMime(mime));

/** An inbound file with no id and no link is 410, an honest answer instead of a futile retry. */
export function servable(msg: MediaMessage, allow: (mime: string | null) => boolean = isInvoiceMime): MediaMessage {
  if (msg.direction === 'inbound' && msg.media_mime && !msg.media_id && !isCrmHistoryRow(msg)) throw httpError(HttpStatus.GONE, 'media_expired');
  if (msg.direction !== 'inbound' || !(msg.media_id || isCrmHistoryRow(msg)) || !allow(msg.media_mime)) {
    throw httpError(HttpStatus.BAD_REQUEST, 'invoice_message');
  }
  return msg;
}

/**
 * W6's gate (a chat bubble, a forward): a family's file (servable with isChatViewMime), or an ECHO, a
 * file the academy phone sent from the WhatsApp Business app (outbound with Meta's media id, docs/19
 * coexistence). An echo is fetched and cached exactly as an inbound file; an outbound row with neither
 * a stored file nor a media id (imported history) is 410 media_expired.
 */
export function chatServable(msg: MediaMessage): MediaMessage {
  if (msg.direction === 'inbound') return servable(msg, isChatViewMime);
  if (!msg.media_id) throw httpError(HttpStatus.GONE, 'media_expired');
  if (!isChatViewMime(msg.media_mime)) throw httpError(HttpStatus.BAD_REQUEST, 'invoice_message');
  return msg;
}

/** Older than WhatsApp keeps the file (and never cached by us): it cannot be fetched any more. */
export function mediaExpired(msg: Pick<MediaMessage, 'created_at' | 'media_path'>, now: Date): boolean {
  return msg.media_path === null && now.getTime() - Date.parse(msg.created_at) > MEDIA_FETCH_DAYS * DAY_MS;
}

/**
 * A file in the CRM's storage: imported history on the crm number, or a message mirrored from the
 * CRM (2026-11-21), which legacy mode stamps with no number. Another driver's number never is.
 */
const fromCrmStorage = (msg: MediaMessage): boolean =>
  isCrmHistoryRow(msg) && (msg.number?.provider ?? 'crm') === 'crm';

/** R-MSG-06: fetched from Meta on first need via the number it came on, then cached privately. */
@Injectable()
export class InboundMedia {
  /** Module mode's per-number clients (in memory; legacy finds none and uses the lines). */
  private readonly numbers = new NumberClients();
  /** Property injection keeps the constructor at three parameters; absent (unit tests) = old-CRM files are 410. */
  @Optional() @Inject(CrmHistoryMedia) private readonly crm?: CrmHistoryMedia;

  constructor(
    private readonly queries: InboundMediaRepo,
    @Inject(WHATSAPP_LINES) private readonly lines: WhatsappLines,
    private readonly storage: StorageService,
  ) {}

  /** The message, checked to be a file we can serve; the caller checks it belongs to the right chat. */
  async load(messageId: string, allow: (mime: string | null) => boolean = isInvoiceMime): Promise<MediaMessage> {
    const msg = await this.queries.message(messageId);
    if (!msg) throw httpError(HttpStatus.NOT_FOUND, 'message_not_found');
    return servable(msg, allow);
  }

  /** As load, through chatServable: an echo of the WhatsApp Business app too. */
  async loadChat(messageId: string): Promise<MediaMessage> {
    const msg = await this.queries.message(messageId);
    if (!msg) throw httpError(HttpStatus.NOT_FOUND, 'message_not_found');
    return chatServable(msg);
  }

  async ensure(messageId: string): Promise<InboundFile> {
    return this.cache(await this.load(messageId));
  }

  /**
   * The cached object of a loaded message, downloading it first (cap: 16 MB audio/video, else 10 MB):
   * from WhatsApp, or an old-CRM file from the CRM's storage (CrmHistoryMedia; no 29-day limit).
   * A final refusal is kept on the row and answered from it later (media-refusal.ts).
   */
  async cache(msg: MediaMessage): Promise<InboundFile> {
    const mime = baseMime(msg.media_mime);
    if (msg.media_path) return { bucket: BUCKETS.waMedia, path: msg.media_path, mime };
    rejectStored(msg.media_refusal);
    const fetched = async () => withinCap(await this.fetch(msg), chatFileMaxBytes(mime));
    const file = await keepingRefusal(fetched, (r) => this.queries.setRefusal(msg.id, r));
    const key = waMediaPath({ messageId: msg.id, mime });
    const path = await this.storage.upload({ bucket: BUCKETS.waMedia, path: key, body: file.bytes, contentType: mime });
    await this.queries.setPath(msg.id, path);
    return { bucket: BUCKETS.waMedia, path, mime };
  }

  private fetch(msg: MediaMessage): Promise<{ bytes: Uint8Array }> {
    if (fromCrmStorage(msg) && this.crm) return this.crm.download(msg);
    if (mediaExpired(msg, new Date()) || !msg.media_id) throw httpError(HttpStatus.GONE, 'media_expired');
    return this.download(msg, msg.media_id);
  }

  /** A Meta 4xx means the id is gone (expired, deleted): 410, not a server error; a dead token is 502. */
  private async download(msg: MediaMessage, mediaId: string): Promise<{ bytes: Uint8Array }> {
    const from = mediaSource(msg, { lines: this.lines, numbers: this.numbers });
    if (from.kind === 'crm') throw httpError(HttpStatus.CONFLICT, CRM_NO_MEDIA);
    if (from.kind === 'none') throw httpError(HttpStatus.SERVICE_UNAVAILABLE, 'line_not_configured');
    if (from.line === 'chat' && !from.client.configured()) throw httpError(HttpStatus.SERVICE_UNAVAILABLE, 'line_not_configured');
    try {
      return await from.client.getMedia(mediaId);
    } catch (e) {
      throw e instanceof WaError ? mediaHttpError(e) : e;
    }
  }
}
