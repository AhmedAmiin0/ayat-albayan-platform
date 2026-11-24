import { CHAT_SEARCH_PAGE, type ChatSearchPage, type ChatSearchQuery } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import type { AuthUser } from '@/common/auth/verify-token';
import { visibleToSales } from '@/modules/messaging/inbox/sales-threads/sales-threads';
import { assertPhone } from '@/modules/messaging/inbox/teacher-threads/teacher-scope';
import { ThreadReads } from '@/modules/messaging/inbox/reads/thread-reads';
import { ChatSearchRepo, type SearchRow } from './chat-search.repo';
import { searchPage } from './chat-search';

/** The rows a caller may read: sales never sees a link template's row (as in her pages). */
type Visible = (rows: SearchRow[]) => SearchRow[];
const ALL: Visible = (rows) => rows;
const SALES: Visible = (rows) => rows.filter(visibleToSales);

/** Same visibility as reading the chat, per request (rule 9); teachers 403 outside scope. */
@Injectable()
export class ChatSearchService {
  constructor(
    private readonly reads: ThreadReads,
    private readonly repo: ChatSearchRepo,
  ) {}

  async search(phone: string, q: ChatSearchQuery, user: AuthUser): Promise<ChatSearchPage> {
    const visible = await this.visibility(phone, user);
    const rows = visible(await this.repo.rows(phone));
    return searchPage(rows, { q: q.q, cursor: q.cursor, limit: CHAT_SEARCH_PAGE });
  }

  private async visibility(phone: string, user: AuthUser): Promise<Visible> {
    if (await this.reads.salesScope(user)) return SALES;
    const scope = await this.reads.scope(user);
    if (scope) assertPhone(scope, phone);
    return ALL;
  }
}
