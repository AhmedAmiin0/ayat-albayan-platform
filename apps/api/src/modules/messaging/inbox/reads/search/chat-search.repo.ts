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
}

/** One read's rows (PostgREST's own cap is 1000). */
export const SCAN_BATCH = 1000;
/** Rows one search reads at most, newest first (a chat has far fewer; pg_trgm is the later fix). */
export const SCAN_MAX = 20_000;

const SELECT = 'id, created_at, body, media_name, template_key' as const;

/**
 * A chat's searchable rows, newest first: not deleted for everyone, not hidden from the platform,
 * not a reaction / edit / revoke marker. The filters are fixed column filters (the phone is a
 * parsed E.164); the typed words never reach SQL (matched in Node, chat-search.ts).
 */
@Injectable()
export class ChatSearchRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

  async rows(phone: string): Promise<SearchRow[]> {
    const out: SearchRow[] = [];
    for (let from = 0; from < SCAN_MAX; from += SCAN_BATCH) {
      const batch = await this.batch(phone, from);
      out.push(...batch);
      if (batch.length < SCAN_BATCH) break;
    }
    return out;
  }

  private async batch(phone: string, from: number): Promise<SearchRow[]> {
    const { data, error } = await this.db
      .from('messages')
      .select(SELECT)
      .eq('phone_e164', phone)
      .is('deleted_at', null)
      .is('hidden_at', null)
      .or(NOT_A_REACTION)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .range(from, from + SCAN_BATCH - 1);
    check(error, 'chat search read');
    return data;
  }
}
