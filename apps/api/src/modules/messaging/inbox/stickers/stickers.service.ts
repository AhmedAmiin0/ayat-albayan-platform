import { stickerKey, type StickerList, type ThreadStickerSend } from '@ab/shared';
import { HttpStatus, Injectable } from '@nestjs/common';
import { waHttpError } from '@/modules/messaging/whatsapp';
import { ForwardFiles } from '@/modules/messaging/inbox/files/forward-files';
import type { Sent } from '@/modules/messaging/inbox/send/outbox';
import { chatLine, type ThreadSend } from '@/modules/messaging/inbox/send/thread-send.service';
import { ThreadsRepo } from '@/modules/messaging/inbox/threads/threads.repo';
import { favouriteItems, recentItems } from './sticker-rows';
import { StickerRepo, type StickerRow } from './sticker.repo';

interface FavouriteInput {
  profileId: string;
  messageId: string;
}

const notFound = () => waHttpError('message_not_found', HttpStatus.NOT_FOUND);

/**
 * The sticker panel (owner 2026-11-01): this staff member's favourites, then the newest stickers
 * received or sent in any chat (any chat's WebP: stickers are no family secret, and no template,
 * sales' only wall, is ever one). A sticker sent from it is one the chats already hold, copied as
 * stored (WhatsApp's 512×512 WebP) to out/… and queued as this staff member's message; the sender
 * sends it as WhatsApp's `sticker` (waSendKind). The line is picked first, as for a text (chatLine:
 * tried after the window on a Kapso chat line; else 409 session_closed / 503), so a refused chat
 * copies nothing.
 */
@Injectable()
export class StickersService {
  constructor(
    private readonly repo: StickerRepo,
    private readonly threads: ThreadsRepo,
    private readonly files: ForwardFiles,
  ) {}

  async list(profileId: string, now = new Date()): Promise<StickerList> {
    const [favourites, recent] = await Promise.all([
      this.repo.favourites(profileId),
      this.repo.recent(),
    ]);
    const rows = await this.repo.messages(favourites.map((f) => f.message_id));
    return {
      favourites: favouriteItems(favourites, { rows, now }),
      recent: recentItems(recent, now),
    };
  }

  /** «أضف إلى المفضلة»: the sticker (by its key), held by this message. */
  async favourite(input: FavouriteInput): Promise<void> {
    const row = await this.sticker(input.messageId);
    const key = stickerKey(row);
    await this.repo.save({ profile_id: input.profileId, sticker_key: key, message_id: row.id });
  }

  /** «أزل من المفضلة»: the same sticker, whichever message saved it. */
  async unfavourite(input: FavouriteInput): Promise<void> {
    const row = await this.sticker(input.messageId);
    await this.repo.drop({ profile_id: input.profileId, sticker_key: stickerKey(row) });
  }

  /** POST /threads/:phone/sticker: the line (ForwardFiles.send reopens Kapso), copy, queue. */
  async send(s: ThreadSend<ThreadStickerSend>, now = new Date()): Promise<Sent> {
    const windows = () => this.threads.numberWindows(s.phone);
    const at = { now, windows, phone: s.phone, kapso: undefined, teacher: !!s.scope };
    await chatLine(await this.threads.thread(s.phone), at);
    await this.sticker(s.input.messageId);
    const source = await this.threads.get(s.input.messageId);
    if (!source) throw notFound();
    const { clientRequestId } = s.input;
    const file = await this.files.copy(source, { actorId: s.actorId, requestId: clientRequestId });
    return this.files.send({ ...s, input: { clientRequestId } }, { ...file, caption: null }, now);
  }

  /** 404 message_not_found: no such message, not a sticker, or hidden from the platform. */
  private async sticker(messageId: string): Promise<StickerRow> {
    const [row] = await this.repo.messages([messageId]);
    if (!row) throw notFound();
    return row;
  }
}
