import { PLAYABLE_MIMES } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import type { MediaRefusal } from '@/modules/messaging/whatsapp/messages/media-refusal/media-refusal.schemas';
import { RECEIPT_FILTERS } from '@/modules/messaging/whatsapp/messages/receipts/receipt-candidates';
import { pgError } from '@/common/db/errors';
import type { CachedMedia, MediaMessage } from './inbound-media.types';

export type { CachedMedia, MediaMessage, MediaNumber } from './inbound-media.types';

const COLUMNS =
  'id, phone_e164, direction, media_id, media_mime, media_path, media_refusal, body, media_name, interactive_payload, created_at, line, hidden_at, number:wa_numbers(id, provider, purpose)';

/** The filters `cached` adds (a select or an update on messages). */
interface Filterable<Q> {
  eq(column: 'direction', value: string): Q;
  not(column: string, op: string, value: unknown): Q;
}

/**
 * PostgREST `or`: exactly a PLAYABLE_MIMES base type, bare or with parameters («; codecs=opus»).
 * Not a bare prefix: `audio/mp4*` also matched audio/mp4a-latm, which the job skips and never
 * clears, so a run of them at the old end would stop every later purge.
 */
export const PLAYABLE_FILTER = PLAYABLE_MIMES.flatMap((m) => [
  `media_mime.ilike.${m}`,
  `media_mime.ilike.${m};*`,
]).join(',');

/**
 * DB touches of InboundMedia and of the chat's file picker (service role; the callers are
 * admin-only).
 */
@Injectable()
export class InboundMediaRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

  async message(id: string): Promise<MediaMessage | null> {
    const { data, error } = await this.db
      .from('messages')
      .select(COLUMNS)
      .eq('id', id)
      .maybeSingle();
    if (error) throw pgError(error);
    return data;
  }

  /**
   * The pickers' files of one phone since `since`, newest first, never hidden: RECEIPT_FILTERS
   * run here, before the limit, so a run of stickers or voice notes never pushes a PDF out.
   */
  async receipts(input: { phone: string; since: string; limit: number }): Promise<MediaMessage[]> {
    const { data, error } = await this.db
      .from('messages')
      .select(COLUMNS)
      .eq('phone_e164', input.phone)
      .eq('direction', 'inbound')
      .is('hidden_at', null)
      .or(RECEIPT_FILTERS.source)
      .or(RECEIPT_FILTERS.notSticker)
      .or(RECEIPT_FILTERS.kind)
      .gte('created_at', input.since)
      .order('created_at', { ascending: false })
      .limit(input.limit);
    if (error) throw pgError(error);
    return data;
  }

  /** Only where it is still empty: two admins opening the same file keep the first path. */
  async setPath(id: string, path: string): Promise<void> {
    const { error } = await this.db
      .from('messages')
      .update({ media_path: path })
      .eq('id', id)
      .is('media_path', null);
    if (error) throw pgError(error);
  }

  /** Only while no copy exists: a file cached by another view is served, never refused. */
  async setRefusal(id: string, refusal: MediaRefusal): Promise<void> {
    const update = this.db.from('messages').update({ media_refusal: refusal });
    const { error } = await update.eq('id', id).is('media_path', null);
    if (error) throw pgError(error);
  }

  /**
   * Cached inbound audio / video older than `before`, oldest first (photos
   * and PDFs are never purged). Uses messages_media_cached_idx (migration 500). `echoes`: the same
   * for cached echoes (outbound with Meta's media id, sent from the WhatsApp Business app), never a
   * file staff sent (out/…); few rows, so no index of their own. Only rows with Meta's media id: an
   * imported old-CRM file (no media id, cached from the CRM link) is our ONLY copy once the CRM's
   * storage is private, so it is never purged (CrmMediaCopyJob).
   */
  async cachedBefore(input: {
    before: string;
    limit: number;
    echoes?: boolean;
  }): Promise<CachedMedia[]> {
    const select = this.db.from('messages').select('id, media_path, media_mime, media_id');
    const { data, error } = await this.cached(select, input.echoes)
      .not('media_path', 'is', null)
      .or(PLAYABLE_FILTER)
      .lt('created_at', input.before)
      .order('created_at', { ascending: true })
      .limit(input.limit);
    if (error) throw pgError(error);
    return data.flatMap((r) =>
      r.media_path
        ? [{ id: r.id, media_path: r.media_path, media_mime: r.media_mime, media_id: r.media_id }]
        : [],
    );
  }

  /**
   * Forget the purged copies (inbound, or cached echoes: a file staff sent keeps its path,
   * messages_content_check).
   */
  async clearPaths(ids: readonly string[], echoes = false): Promise<void> {
    if (!ids.length) return;
    const { error } = await this.cached(
      this.db
        .from('messages')
        .update({ media_path: null })
        .in('id', [...ids]),
      echoes,
    );
    if (error) throw pgError(error);
  }

  /**
   * Inbound rows with Meta's media id (never an old-CRM copy), or echoes: outbound with a media id
   * and a cached copy that is not a sent file.
   */
  private cached<Q extends Filterable<Q>>(q: Q, echoes = false): Q {
    if (!echoes) return q.eq('direction', 'inbound').not('media_id', 'is', null);
    return q
      .eq('direction', 'outbound')
      .not('media_id', 'is', null)
      .not('media_path', 'like', 'out/%')
      .not('media_path', 'like', 'minio:out/%');
  }
}
