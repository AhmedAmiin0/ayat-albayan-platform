import type { SignedDownload, ThreadMediaItem } from '@ab/shared';
import { HttpStatus, Injectable } from '@nestjs/common';
import { BUCKETS } from '../../../../common/storage/storage.paths';
import { StorageService } from '../../../../common/storage/storage.service';
import { InboundMediaQueries, type MediaMessage } from '../../whatsapp/messages/inbound-media.queries';
import { baseMime, chatServable, InboundMedia, type InboundFile, mediaExpired, servable } from '../../whatsapp/messages/inbound-media.service';
import { waHttpError } from '../../whatsapp/templates/catalog/template.mapper';
import { isCrmHistoryRow, receiptMime, receiptName } from '@/modules/messaging/whatsapp';
import { downloadName } from './download-name';

const DAY_MS = 86_400_000;
/** The picker looks back this far and shows this many files. */
const LOOKBACK_DAYS = 30;
const PICKER_SIZE = 12;

export type ThreadFile = SignedDownload & { mime: string };
/** A picker file: its message and our stored object (bucket, path, the mime it is served as). */
interface PickedFile {
  msg: MediaMessage;
  file: InboundFile;
}

/**
 * The files a guardian sent in one chat, for «من الشات» on the booking screen (R-MSG-06) and
 * the sales receipt picker: photos and PDFs, never a sticker or a voice note (receiptMime). The
 * list is metadata only; each thumbnail is fetched lazily through `file`, which downloads from
 * Meta on first use and returns a signed URL of our own copy.
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
    const since = new Date(now.getTime() - LOOKBACK_DAYS * DAY_MS).toISOString();
    const rows = await this.queries.receipts({ phone, since, limit: PICKER_SIZE });
    return rows.flatMap((m) => {
      const mime = receiptMime(m);
      if (!mime) return [];
      // An imported file's body is its old-CRM link, never a caption; a PDF shows its name.
      const caption = (isCrmHistoryRow(m) ? null : m.body) ?? receiptName(m);
      const created = new Date(m.created_at).toISOString();
      const expired = mediaExpired(m, now);
      return [{ message_id: m.id, created_at: created, mime, caption, expired }];
    });
  }

  /** A listed file as a signed URL: 404 outside this chat, 400 invoice_message for another file. */
  async file(input: { phone: string; messageId: string }): Promise<ThreadFile> {
    const picked = await this.pick(input);
    if (!picked) throw waHttpError('invoice_message', HttpStatus.BAD_REQUEST);
    const { bucket, path, mime } = picked.file;
    return { ...(await this.storage.signedDownload({ bucket, path })), mime };
  }

  /**
   * One of `list`'s files as our stored object; null for any other file of this chat (a sticker,
   * a voice note). The ownership check runs first (404 message_not_found). A stored copy
   * (media_path) is used as stored, else cached on first use under the mime it is served as (an
   * octet-stream «x.pdf» as a PDF); servable's 410 media_expired when it cannot be had.
   */
  async pick(input: { phone: string; messageId: string }): Promise<PickedFile | null> {
    const msg = await this.queries.message(input.messageId);
    if (msg?.phone_e164 !== input.phone || msg.hidden_at) {
      throw waHttpError('message_not_found', HttpStatus.NOT_FOUND);
    }
    const mime = msg.direction === 'inbound' ? receiptMime(msg) : null;
    if (!mime) return null;
    const path = msg.media_path;
    if (path) return { msg, file: { bucket: BUCKETS.waMedia, path, mime } };
    return { msg, file: await this.media.cache(servable({ ...msg, media_mime: mime })) };
  }

  /**
   * W6 only (a chat bubble): any file of this phone's chat. The ownership check runs first (404
   * message_not_found). A stored outbound file (D2: staff sent it, out/…; or a cached echo) is signed
   * as stored. Else chatServable: inbound images / PDFs, voice notes and videos (isChatViewMime), and
   * echoes of the WhatsApp Business app (outbound with Meta's media id), cached from WhatsApp on first
   * use; an outbound row with neither (imported history) is 410 media_expired. `download` («تنزيل»): the URL saves
   * the file under downloadName (Content-Disposition) instead of opening it.
   */
  async bubbleFile(input: { phone: string; messageId: string; download?: boolean }): Promise<ThreadFile> {
    const { msg, file } = await this.bubbleObject(input);
    const named = input.download ? { download: downloadName(msg) } : {};
    const signed = await this.storage.signedDownload({ bucket: file.bucket, path: file.path, ...named });
    return { ...signed, mime: file.mime };
  }

  /** bubbleFile's message and stored object, unsigned: the PDF preview (pdf/) reads the same file under the same rules. */
  async bubbleObject(input: { phone: string; messageId: string }): Promise<{ msg: MediaMessage; file: InboundFile }> {
    const msg = await this.queries.message(input.messageId);
    // A message hidden from the platform keeps its file away from staff too («حذف من المنصة»).
    if (!msg || msg.phone_e164 !== input.phone || msg.hidden_at) throw waHttpError('message_not_found', HttpStatus.NOT_FOUND);
    if (msg.direction === 'outbound' && msg.media_path) {
      return { msg, file: { bucket: BUCKETS.waMedia, path: msg.media_path, mime: baseMime(msg.media_mime) } };
    }
    return { msg, file: await this.media.cache(chatServable(msg)) };
  }
}
