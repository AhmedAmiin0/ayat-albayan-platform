import type { Tables } from '@ab/db';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';

/** What the panel reads of a sticker message. */
export type StickerRow = Pick<
  Tables<'messages'>,
  'id' | 'phone_e164' | 'direction' | 'media_id' | 'media_path' | 'created_at' | 'interactive_payload'
>;

/** One staff member's favourite (migration 998): the sticker's key and the message holding it. */
export type Favourite = Pick<Tables<'sticker_favourites'>, 'profile_id' | 'sticker_key' | 'message_id'>;

const COLUMNS = 'id, phone_e164, direction, media_id, media_path, created_at, interactive_payload';
/** WhatsApp's stickers are its only WebP (messages_sticker_idx, migration 998). */
const STICKER_MIME = 'image/webp';
/** How many of the newest sticker messages «الأحدث» reads; deduplicated and capped after. */
const RECENT_SCAN = 120;
const FAVOURITES_MAX = 60;

function rows<T>(r: { data: T[] | null; error: { message: string } | null }, what: string): T[] {
  if (r.error) throw new Error(`${what} failed: ${r.error.message}`);
  return r.data ?? [];
}

/** Sticker messages of every chat and each staff member's favourites (service role). */
@Injectable()
export class StickerRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** The newest sticker messages, not hidden from the platform («حذف من المنصة»). */
  async recent(): Promise<StickerRow[]> {
    const r = await this.db
      .from('messages')
      .select(COLUMNS)
      .eq('media_mime', STICKER_MIME)
      .is('hidden_at', null)
      .order('created_at', { ascending: false })
      .limit(RECENT_SCAN);
    return rows(r, 'stickers read');
  }

  /** These sticker messages (a favourite's, a send's source), not hidden. */
  async messages(ids: readonly string[]): Promise<StickerRow[]> {
    if (ids.length === 0) return [];
    const r = await this.db
      .from('messages')
      .select(COLUMNS)
      .in('id', [...ids])
      .eq('media_mime', STICKER_MIME)
      .is('hidden_at', null);
    return rows(r, 'sticker read');
  }

  /** Newest first. */
  async favourites(profileId: string): Promise<Favourite[]> {
    const r = await this.db
      .from('sticker_favourites')
      .select('profile_id, sticker_key, message_id')
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false })
      .limit(FAVOURITES_MAX);
    return rows(r, 'sticker favourites read');
  }

  /** Saved again = the same row, pointing at this message now. */
  async save(f: Favourite): Promise<void> {
    const { error } = await this.db
      .from('sticker_favourites')
      .upsert({ ...f, created_at: new Date().toISOString() }, { onConflict: 'profile_id,sticker_key' });
    if (error) throw new Error(`sticker favourite save failed: ${error.message}`);
  }

  async drop(f: Omit<Favourite, 'message_id'>): Promise<void> {
    const { error } = await this.db
      .from('sticker_favourites')
      .delete()
      .eq('profile_id', f.profile_id)
      .eq('sticker_key', f.sticker_key);
    if (error) throw new Error(`sticker favourite drop failed: ${error.message}`);
  }
}
