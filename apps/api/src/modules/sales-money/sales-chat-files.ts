import { RECEIPT_MIMES, type SalesChatReceipt, type SalesChatReceiptFile } from '@ab/shared';
import { HttpStatus, Injectable } from '@nestjs/common';
import { BUCKETS, chatName } from '../../common/storage/storage.paths';
import { StorageService } from '../../common/storage/storage.service';
import { ThreadMediaService } from '../inbox/thread-media.service';
import { badRequest } from '../scheduling/errors';
import { InboundMedia } from '../whatsapp/inbound-media.service';
import { waHttpError } from '../whatsapp/template.mapper';

const isReceiptMime = (mime: string): boolean => (RECEIPT_MIMES as readonly string[]).includes(mime);

/**
 * The images and PDFs ONE family sent in its chat, as receipt candidates (docs/16 row 15: the narrow
 * exception to inbox.media). The caller has already resolved the phone from a student she owns; every
 * method is scoped to that phone, so another family's file is a 404 even with its message id.
 */
@Injectable()
export class SalesChatFiles {
  constructor(
    private readonly thread: ThreadMediaService,
    private readonly media: InboundMedia,
    private readonly storage: StorageService,
  ) {}

  /** Inbound image / PDF messages of the last 30 days, newest first (metadata only, nothing downloaded). */
  async list(phone: string): Promise<SalesChatReceipt[]> {
    const items = await this.thread.list(phone);
    return items
      .filter((m) => isReceiptMime(m.mime))
      .map((m) => ({ message_id: m.message_id, created_at: m.created_at, mime: m.mime, caption: m.caption, expired: m.expired }));
  }

  /** A thumbnail: the file as a short-lived signed URL; 404 message_not_found outside this chat. */
  async sign(input: { phone: string; messageId: string }): Promise<SalesChatReceiptFile> {
    const file = await this.thread.file(input);
    return { url: file.url, expires_at: file.expires_at, mime: file.mime };
  }

  /**
   * Copies the chosen message's file to receipts/{subscriptionId}/wa-{messageId}.{ext}, server-side
   * (deterministic name: a retry lands on the same object). 404 outside this chat, 400 receipt_type for a
   * file that is not an image / PDF, 400 receipt_too_large over maxBytes (the copy is removed again).
   */
  async copy(input: { phone: string; messageId: string; subscriptionId: string; maxBytes: number }): Promise<string> {
    const msg = await this.media.load(input.messageId);
    if (msg.phone_e164 !== input.phone) throw waHttpError('message_not_found', HttpStatus.NOT_FOUND);
    const from = await this.media.cache(msg);
    if (!isReceiptMime(from.mime)) throw badRequest('receipt_type');
    const to = { bucket: BUCKETS.receipts, path: `${input.subscriptionId}/${chatName(msg.id, from.mime)}` };
    await this.storage.copy({ from: { bucket: from.bucket, path: from.path }, to });
    const info = await this.storage.info(to);
    if (!info) throw new Error('receipt copy is missing after copy');
    if (info.size > input.maxBytes) {
      await this.storage.remove(to).catch(() => undefined);
      throw badRequest('receipt_too_large');
    }
    return to.path;
  }
}
