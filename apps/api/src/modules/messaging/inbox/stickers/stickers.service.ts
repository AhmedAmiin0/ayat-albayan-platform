import { stickerKey, type StickerList } from '@ab/shared';
import { HttpStatus, Injectable } from '@nestjs/common';
import { waHttpError } from '@/modules/messaging/whatsapp';
import { favouriteItems, recentItems } from './sticker-rows';
import { StickerRepo, type StickerRow } from './sticker.repo';

interface FavouriteInput {
  profileId: string;
  messageId: string;
}

/**
 * The sticker panel (owner 2026-11-01): this staff member's favourites, then the newest stickers
 * received or sent in any chat. A sticker is any chat's WebP; stickers are no family secret, and
 * no template (sales' only wall) is ever one.
 */
@Injectable()
export class StickersService {
  constructor(private readonly repo: StickerRepo) {}

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

  /** 404 message_not_found: no such message, not a sticker, or hidden from the platform. */
  async sticker(messageId: string): Promise<StickerRow> {
    const [row] = await this.repo.messages([messageId]);
    if (!row) throw waHttpError('message_not_found', HttpStatus.NOT_FOUND);
    return row;
  }
}
