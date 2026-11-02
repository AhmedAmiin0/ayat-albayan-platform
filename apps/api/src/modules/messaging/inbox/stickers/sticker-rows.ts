import { stickerKey, type StickerItem } from '@ab/shared';
import { mediaExpired } from '@/modules/messaging/whatsapp';
import type { Favourite, StickerRow } from './sticker.repo';

// The sticker panel's lists (owner 2026-11-01), as pure functions over the rows StickerRepo reads.

/** «الأحدث»: at most this many stickers, after one per sticker. */
export const RECENT_MAX = 30;

/** A sticker the API can still copy: a stored file (ours or cached), or one WhatsApp keeps. */
export const sendable = (row: StickerRow, now: Date): boolean =>
  row.media_path !== null || (row.media_id !== null && !mediaExpired(row, now));

const toItem = (row: StickerRow): StickerItem => ({
  message_id: row.id,
  phone: row.phone_e164,
  key: stickerKey(row),
});

/** Newest first, one per sticker (its sha256), only those the API can still send. */
export function recentItems(rows: readonly StickerRow[], now: Date): StickerItem[] {
  const items = rows.filter((r) => sendable(r, now)).map(toItem);
  const first = items.filter((item, i) => items.findIndex((o) => o.key === item.key) === i);
  return first.slice(0, RECENT_MAX);
}

/** The favourites in their order, each through the message holding it (a hidden one drops out). */
export function favouriteItems(
  favourites: readonly Favourite[],
  held: { rows: readonly StickerRow[]; now: Date },
): StickerItem[] {
  const byId = new Map(held.rows.map((r) => [r.id, r]));
  return favourites.flatMap((f) => {
    const row = byId.get(f.message_id);
    return row && sendable(row, held.now) ? [{ ...toItem(row), key: f.sticker_key }] : [];
  });
}
