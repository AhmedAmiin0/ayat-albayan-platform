import { PLAYABLE_MIMES, type WaLine } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../../../common/db/db.module';

/** The number a message came in on (messages.number_id → wa_numbers): it decides who can fetch its media. */
export type MediaNumber = { id: string; provider: string; purpose: WaLine };

/** The columns of an inbound message that carry a file (R-MSG-06). */
export type MediaMessage = {
  id: string;
  phone_e164: string;
  direction: 'inbound' | 'outbound';
  media_id: string | null;
  media_mime: string | null;
  media_path: string | null;
  /** The file's caption. */
  body: string | null;
  /** A sent file's name (thread-file-send); «تنزيل» saves under it. */
  media_name?: string | null;
  created_at: string;
  /** The receiving line: its token is the only one that can fetch the media id (null = notifications). */
  line: WaLine | null;
  /** Its number (null = not stamped: legacy rows); the old CRM number's history is stamped with it. */
  number?: MediaNumber | null;
};
const COLUMNS = 'id, phone_e164, direction, media_id, media_mime, media_path, body, media_name, created_at, line, number:wa_numbers(id, provider, purpose)';

/** The filters `cached` adds (a select or an update on messages). */
type Filterable<Q> = { eq(column: 'direction', value: string): Q; not(column: string, op: string, value: unknown): Q };

/** A cached inbound voice note or video, for the 30-day purge (WaMediaRetentionJob); always a Meta media id. */
export type CachedMedia = { id: string; media_path: string; media_mime: string | null; media_id: string | null };
/**
 * PostgREST `or`: exactly a PLAYABLE_MIMES base type, bare or with parameters («; codecs=opus»). Not a
 * bare prefix: `audio/mp4*` also matched audio/mp4a-latm, which the job skips and never clears, so a
 * run of them at the old end would stop every later purge.
 */
export const PLAYABLE_FILTER = PLAYABLE_MIMES.flatMap((m) => [`media_mime.ilike.${m}`, `media_mime.ilike.${m};*`]).join(',');

/** DB touches of InboundMedia and of the chat's file picker (service role; the callers are admin-only). */
@Injectable()
export class InboundMediaQueries {
  constructor(@Inject(DB) private readonly db: Db) {}

  async message(id: string): Promise<MediaMessage | null> {
    const { data, error } = await this.db.from('messages').select(COLUMNS).eq('id', id).maybeSingle();
    if (error) throw new Error(`message read failed: ${error.message}`);
    return data;
  }

  /** Inbound files of one phone since `since`, newest first (the caller filters by mime). */
  async recent(input: { phone: string; since: string; limit: number }): Promise<MediaMessage[]> {
    const { data, error } = await this.db
      .from('messages')
      .select(COLUMNS)
      .eq('phone_e164', input.phone)
      .eq('direction', 'inbound')
      .not('media_id', 'is', null)
      .gte('created_at', input.since)
      .order('created_at', { ascending: false })
      .limit(input.limit);
    if (error) throw new Error(`thread media read failed: ${error.message}`);
    return data;
  }

  /** Only where it is still empty: two admins opening the same file keep the first path. */
  async setPath(id: string, path: string): Promise<void> {
    const { error } = await this.db.from('messages').update({ media_path: path }).eq('id', id).is('media_path', null);
    if (error) throw new Error(`message media_path update failed: ${error.message}`);
  }

  /**
   * Cached inbound audio / video older than `before`, oldest first (owner 2026-10-19 #2: photos
   * and PDFs are never purged). Uses messages_media_cached_idx (migration 500). `echoes`: the same
   * for cached echoes (outbound with Meta's media id, sent from the WhatsApp Business app), never a
   * file staff sent (out/…); few rows, so no index of their own. Only rows with Meta's media id: an
   * imported old-CRM file (no media id, cached from the CRM link) is our ONLY copy once the CRM's
   * storage is private, so it is never purged (owner 2026-10-27, CrmMediaCopyJob).
   */
  async cachedBefore(input: { before: string; limit: number; echoes?: boolean }): Promise<CachedMedia[]> {
    const { data, error } = await this.cached(this.db.from('messages').select('id, media_path, media_mime, media_id'), input.echoes)
      .not('media_path', 'is', null)
      .or(PLAYABLE_FILTER)
      .lt('created_at', input.before)
      .order('created_at', { ascending: true })
      .limit(input.limit);
    if (error) throw new Error(`cached media read failed: ${error.message}`);
    return data.flatMap((r) => (r.media_path ? [{ id: r.id, media_path: r.media_path, media_mime: r.media_mime, media_id: r.media_id }] : []));
  }

  /** Forget the purged copies (inbound, or cached echoes: a file staff sent keeps its path, messages_content_check). */
  async clearPaths(ids: readonly string[], echoes = false): Promise<void> {
    if (!ids.length) return;
    const { error } = await this.cached(this.db.from('messages').update({ media_path: null }).in('id', [...ids]), echoes);
    if (error) throw new Error(`message media_path clear failed: ${error.message}`);
  }

  /** Inbound rows with Meta's media id (never an old-CRM copy), or echoes: outbound with a media id and a cached copy that is not a sent file. */
  private cached<Q extends Filterable<Q>>(q: Q, echoes = false): Q {
    if (!echoes) return q.eq('direction', 'inbound').not('media_id', 'is', null);
    return q.eq('direction', 'outbound').not('media_id', 'is', null).not('media_path', 'like', 'out/%');
  }
}
