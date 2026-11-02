import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import { NOT_A_REACTION } from '@/modules/messaging/whatsapp';
import { check } from '@/modules/messaging/inbox/threads/store/check';

/** What the search reads of a message: its time, its texts and (sales' wall) its template. */
export interface SearchRow {
  id: string;
  created_at: string;
  body: string | null;
  media_name: string | null;
  template_key: string | null;
  direction: 'inbound' | 'outbound';
  media_mime: string | null;
}

/** One read's rows (PostgREST's own cap is 1000). */
export const SCAN_BATCH = 1000;
/** Rows one search reads at most, newest first (a chat has far fewer; pg_trgm is the later fix). */
const SCAN_MAX = 20_000;

const SELECT = 'id, created_at, body, media_name, template_key, direction, media_mime' as const;

/**
 * A chat's searchable rows, newest first: not deleted for everyone, not hidden from the platform,
 * not a reaction / edit / revoke marker. The filters are fixed column filters (the phone is a
 * parsed E.164); the typed words never reach SQL (matched in Node, chat-search.ts).
 */
@Injectable()
export class ChatSearchRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

  /**
   * Keyset batches (no offsets: a row hidden meanwhile never shifts one out): each batch reads up
   * to the oldest time seen (`lte`, so rows sharing it are read again and dropped by id).
   */
  async rows(phone: string): Promise<SearchRow[]> {
    const seen = new Map<string, SearchRow>();
    let upTo: string | undefined;
    for (let n = 0; n < SCAN_MAX / SCAN_BATCH; n += 1) {
      const batch = await this.batch(phone, upTo);
      const fresh = batch.filter((r) => !seen.has(r.id));
      for (const r of fresh) seen.set(r.id, r);
      upTo = batch.at(-1)?.created_at;
      if (batch.length < SCAN_BATCH || fresh.length === 0) break;
    }
    return [...seen.values()];
  }

  private async batch(phone: string, upTo: string | undefined): Promise<SearchRow[]> {
    let query = this.db
      .from('messages')
      .select(SELECT)
      .eq('phone_e164', phone)
      .is('deleted_at', null)
      .is('hidden_at', null)
      .or(NOT_A_REACTION);
    if (upTo) query = query.lte('created_at', upTo);
    const { data, error } = await query
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(SCAN_BATCH);
    check(error, 'chat search read');
    return data;
  }
}
