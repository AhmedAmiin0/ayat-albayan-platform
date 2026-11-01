import type { ThreadStickerSend } from '@ab/shared';
import { HttpStatus, Injectable } from '@nestjs/common';
import { waHttpError } from '@/modules/messaging/whatsapp';
import { ForwardFiles } from '@/modules/messaging/inbox/files/forward-files';
import type { Sent } from '@/modules/messaging/inbox/send/outbox';
import { sendLine, type ThreadSend } from '@/modules/messaging/inbox/send/thread-send.service';
import { ThreadsRepo } from '@/modules/messaging/inbox/threads/threads.repo';
import { StickersService } from './stickers.service';

/**
 * A sticker from the panel (owner 2026-11-01): one the chats already hold, copied as stored (a
 * 512×512 WebP from WhatsApp) to out/… and queued as this staff member's message; the sender sends
 * it as WhatsApp's `sticker` (waSendKind). The 24 h window and the line are checked first, as for
 * a file (409 session_closed / 503 line_not_configured), so a closed chat copies nothing.
 */
@Injectable()
export class StickerSender {
  constructor(
    private readonly stickers: StickersService,
    private readonly threads: ThreadsRepo,
    private readonly files: ForwardFiles,
  ) {}

  async send(s: ThreadSend<ThreadStickerSend>, now = new Date()): Promise<Sent> {
    const windows = () => this.threads.numberWindows(s.phone);
    await sendLine(await this.threads.thread(s.phone), { now, windows });
    await this.stickers.sticker(s.input.messageId);
    const source = await this.threads.get(s.input.messageId);
    if (!source) throw waHttpError('message_not_found', HttpStatus.NOT_FOUND);
    const { clientRequestId } = s.input;
    const file = await this.files.copy(source, { actorId: s.actorId, requestId: clientRequestId });
    return this.files.send({ ...s, input: { clientRequestId } }, { ...file, caption: null }, now);
  }
}
