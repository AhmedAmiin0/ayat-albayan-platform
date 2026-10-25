import { isChatViewMime, type SignedDownload, type ThreadMediaItem } from '@ab/shared';
import { HttpStatus, Injectable } from '@nestjs/common';
import { BUCKETS } from '../../common/storage/storage.paths';
import { StorageService } from '../../common/storage/storage.service';
import { InboundMediaQueries } from '../whatsapp/messages/inbound-media.queries';
import { baseMime, InboundMedia, isInvoiceMime, mediaExpired, servable } from '../whatsapp/messages/inbound-media.service';
import { waHttpError } from '../whatsapp/template.mapper';

const DAY_MS = 86_400_000;
/** The picker looks back this far and shows this many files. */
const LOOKBACK_DAYS = 30;
const PICKER_SIZE = 12;

export type ThreadFile = SignedDownload & { mime: string };

/**
 * The files a guardian sent in one chat, for «من الشات» on the booking screen (R-MSG-06). The
 * list is metadata only; each thumbnail is fetched lazily through `file`, which downloads from
 * Meta on first use and returns a signed URL of our own copy. Admin only.
 */
@Injectable()
export class ThreadMediaService {
  constructor(
    private readonly queries: InboundMediaQueries,
    private readonly media: InboundMedia,
    private readonly storage: StorageService,
  ) {}

  async list(phone: string): Promise<ThreadMediaItem[]> {
    const now = new Date();
    const rows = await this.queries.recent({
      phone,
      since: new Date(now.getTime() - LOOKBACK_DAYS * DAY_MS).toISOString(),
      limit: 50,
    });
    return rows
      .filter((m) => isInvoiceMime(m.media_mime))
      .slice(0, PICKER_SIZE)
      .map((m) => ({
        message_id: m.id,
        created_at: new Date(m.created_at).toISOString(),
        mime: baseMime(m.media_mime),
        caption: m.body,
        expired: mediaExpired(m, now),
      }));
  }

  /** 404 message_not_found when the message is not in this phone's chat (never reveal another family's). */
  async file(input: { phone: string; messageId: string }): Promise<ThreadFile> {
    const msg = await this.media.load(input.messageId);
    if (msg.phone_e164 !== input.phone) throw waHttpError('message_not_found', HttpStatus.NOT_FOUND);
    const file = await this.media.cache(msg);
    const signed = await this.storage.signedDownload({ bucket: file.bucket, path: file.path });
    return { ...signed, mime: file.mime };
  }

  /**
   * W6 only (a chat bubble): any file of this phone's chat. The ownership check runs first (404
   * message_not_found). Outbound = a file staff sent (D2): signed from wa-media as stored, 410
   * media_expired when there is none (imported history). Inbound = images / PDFs, voice notes and
   * videos (isChatViewMime), cached from WhatsApp on first use.
   */
  async bubbleFile(input: { phone: string; messageId: string }): Promise<ThreadFile> {
    const msg = await this.queries.message(input.messageId);
    if (!msg || msg.phone_e164 !== input.phone) throw waHttpError('message_not_found', HttpStatus.NOT_FOUND);
    if (msg.direction === 'outbound') {
      if (!msg.media_path) throw waHttpError('media_expired', HttpStatus.GONE);
      const signed = await this.storage.signedDownload({ bucket: BUCKETS.waMedia, path: msg.media_path });
      return { ...signed, mime: baseMime(msg.media_mime) };
    }
    const file = await this.media.cache(servable(msg, isChatViewMime));
    const signed = await this.storage.signedDownload({ bucket: file.bucket, path: file.path });
    return { ...signed, mime: file.mime };
  }
}
