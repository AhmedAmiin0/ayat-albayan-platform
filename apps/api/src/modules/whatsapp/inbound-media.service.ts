import { INVOICE_MAX_BYTES, INVOICE_MIMES } from '@ab/shared';
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { BUCKETS, waMediaPath } from '../../common/storage/storage.paths';
import { StorageService } from '../../common/storage/storage.service';
import { InboundMediaQueries, type MediaMessage } from './inbound-media.queries';
import { waHttpError } from './template.mapper';
import { WHATSAPP_CLIENT, WaError, type WhatsappClient } from './whatsapp.types';

/** Meta keeps a media id about 30 days; a day less, so a download never races the deadline. */
export const MEDIA_FETCH_DAYS = 29;
const DAY_MS = 86_400_000;

export type InboundFile = { bucket: typeof BUCKETS.waMedia; path: string; mime: string };

/** «image/jpeg; codecs=…» → «image/jpeg». */
export const baseMime = (mime: string | null): string => mime?.split(';')[0]?.trim().toLowerCase() ?? '';
export const isInvoiceMime = (mime: string | null): boolean => (INVOICE_MIMES as readonly string[]).includes(baseMime(mime));

/** Older than WhatsApp keeps the file (and never cached by us): it cannot be fetched any more. */
export function mediaExpired(msg: Pick<MediaMessage, 'created_at' | 'media_path'>, now: Date): boolean {
  return msg.media_path === null && now.getTime() - Date.parse(msg.created_at) > MEDIA_FETCH_DAYS * DAY_MS;
}

/**
 * An inbound WhatsApp image or PDF as a file we own (R-MSG-06). The webhook stores only Meta's
 * media id, so the first time an admin needs the file (a thumbnail, «من الشات» on a booking) it is
 * fetched from Meta and cached in the private `wa-media` bucket; later calls read the cache.
 * 404 message_not_found, 400 invoice_message (not inbound, or not an image / PDF), 410 media_expired
 * (older than 29 days, or Meta refuses the id), 413 invoice_too_large.
 */
@Injectable()
export class InboundMedia {
  constructor(
    private readonly queries: InboundMediaQueries,
    @Inject(WHATSAPP_CLIENT) private readonly client: WhatsappClient,
    private readonly storage: StorageService,
  ) {}

  /** The message, checked to be a file we can serve; the caller checks it belongs to the right chat. */
  async load(messageId: string): Promise<MediaMessage> {
    const msg = await this.queries.message(messageId);
    if (!msg) throw waHttpError('message_not_found', HttpStatus.NOT_FOUND);
    if (msg.direction !== 'inbound' || !msg.media_id || !isInvoiceMime(msg.media_mime)) {
      throw waHttpError('invoice_message', HttpStatus.BAD_REQUEST);
    }
    return msg;
  }

  async ensure(messageId: string): Promise<InboundFile> {
    return this.cache(await this.load(messageId));
  }

  /** The cached object of a loaded message, downloading it first when this is the first use. */
  async cache(msg: MediaMessage): Promise<InboundFile> {
    const mime = baseMime(msg.media_mime);
    if (msg.media_path) return { bucket: BUCKETS.waMedia, path: msg.media_path, mime };
    if (mediaExpired(msg, new Date()) || !msg.media_id) throw waHttpError('media_expired', HttpStatus.GONE);
    const file = await this.download(msg.media_id);
    if (file.bytes.byteLength > INVOICE_MAX_BYTES) {
      throw waHttpError('invoice_too_large', HttpStatus.PAYLOAD_TOO_LARGE);
    }
    const path = waMediaPath({ messageId: msg.id, mime });
    await this.storage.upload({ bucket: BUCKETS.waMedia, path, body: file.bytes, contentType: mime });
    await this.queries.setPath(msg.id, path);
    return { bucket: BUCKETS.waMedia, path, mime };
  }

  /** A Meta 4xx means the id is gone (expired, deleted): 410, not a server error. */
  private async download(mediaId: string): Promise<{ bytes: Uint8Array }> {
    try {
      return await this.client.getMedia(mediaId);
    } catch (e) {
      const gone = e instanceof WaError && e.info.status >= 400 && e.info.status < 500;
      if (gone) throw waHttpError('media_expired', HttpStatus.GONE);
      throw e;
    }
  }
}
