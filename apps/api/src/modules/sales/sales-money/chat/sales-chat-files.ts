import type { SalesChatReceipt, SalesChatReceiptFile } from '@ab/shared';
import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { BUCKETS, extFor } from '../../../../common/storage/storage.paths';
import { StorageService } from '../../../../common/storage/storage.service';
import { ThreadMediaService } from '../../../messaging/inbox/files/thread-media.service';
import { badRequest } from '../../../../common/http/errors';

/**
 * The photos and PDFs ONE family sent in its chat, as receipt candidates (docs/16 row 18: the
 * narrow exception to inbox.media): the chat pickers' files (ThreadMediaService), never a sticker
 * or a voice note. The caller has already resolved the phone from a student she owns; every
 * method is scoped to that phone, so another family's file is a 404 even with its message id.
 */
@Injectable()
export class SalesChatFiles {
  constructor(
    private readonly thread: ThreadMediaService,
    private readonly storage: StorageService,
  ) {}

  /** The chat's photos / PDFs of the last 30 days, newest first (metadata only, no download). */
  async list(phone: string): Promise<SalesChatReceipt[]> {
    const items = await this.thread.list(phone);
    return items.map((m) => ({
      message_id: m.message_id,
      created_at: m.created_at,
      mime: m.mime,
      caption: m.caption,
      expired: m.expired,
    }));
  }

  /** A thumbnail: the file as a short-lived signed URL; 404 message_not_found outside this chat. */
  async sign(input: { phone: string; messageId: string }): Promise<SalesChatReceiptFile> {
    const file = await this.thread.file(input);
    return { url: file.url, expires_at: file.expires_at, mime: file.mime };
  }

  /**
   * Copies the chosen message's file to receipts/{subscriptionId}/wa-{messageId}-{uuid}.{ext},
   * server-side: a new object per pick, so one chat file picked for two payments is never one
   * object shared by both (the payment refuses a path another payment holds: 409
   * attachment_in_use). 404 outside this chat, 400 receipt_type for any file `list` does not
   * offer (a sticker, a voice note), 400 receipt_too_large over maxBytes (copy removed).
   */
  async copy(input: { phone: string; messageId: string; subscriptionId: string; maxBytes: number }): Promise<string> {
    const picked = await this.thread.pick({ phone: input.phone, messageId: input.messageId });
    if (!picked) throw badRequest('receipt_type');
    const { msg, file } = picked;
    const to = { bucket: BUCKETS.receipts, path: `${input.subscriptionId}/wa-${msg.id}-${randomUUID()}.${extFor(file.mime)}` };
    await this.storage.copy({ from: { bucket: file.bucket, path: file.path }, to });
    const info = await this.storage.info(to);
    if (!info) throw new Error('receipt copy is missing after copy');
    if (info.size > input.maxBytes) {
      await this.storage.remove(to).catch(() => undefined);
      throw badRequest('receipt_too_large');
    }
    return to.path;
  }
}
