import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import { check } from '@/modules/messaging/inbox/threads/store/check';
import type { SearchRow } from './chat-search.repo';

/** A hit as the RPC returns it: the searched row with its chat and the chat's name. */
export interface MessageSearchRow extends SearchRow {
  phone_e164: string;
  display_name: string | null;
}

/** What the caller may search (MessageSearchService) and where the page starts. */
interface MessageSearchInput {
  q: string;
  /** null = every chat (the admin, sales); a teacher's scope otherwise. */
  phones: string[] | null;
  /** The academy's own numbers: never searched, for any role. */
  hide: string[];
  /** Templates whose rows the caller never sees (sales: the link templates). */
  skipTemplates: string[];
  /** The raw cursor (microseconds kept: splitSearchCursor), null for the first page. */
  before: { at: string; id: string } | null;
  limit: number;
}

/**
 * «بحث في كل الرسائل» (docs/37): one call of public.search_messages (migration
 * 20261106000400) over the stored, trigram-indexed fold. The typed words reach SQL only as an RPC
 * argument; SQL escapes %, _ and \ itself (never an or= string, never a pattern built here).
 */
@Injectable()
export class MessageSearchRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** Newest first, `limit + 1` rows so the page knows whether older hits remain. */
  async search(input: MessageSearchInput): Promise<MessageSearchRow[]> {
    const { data, error } = await this.db.rpc('search_messages', {
      p_q: input.q,
      p_phones: input.phones,
      p_hide: input.hide,
      p_skip_templates: input.skipTemplates,
      p_before_at: input.before?.at ?? null,
      p_before_id: input.before?.id ?? null,
      p_limit: input.limit + 1,
    });
    check(error, 'message search');
    return data;
  }
}
