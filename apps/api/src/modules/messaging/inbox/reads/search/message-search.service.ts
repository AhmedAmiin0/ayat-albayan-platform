import {
  MESSAGE_SEARCH_PAGE,
  splitSearchCursor,
  type MessageSearchPage,
  type MessageSearchQuery,
} from '@ab/shared';
import { Injectable } from '@nestjs/common';
import type { AuthUser } from '@/common/auth/verify-token';
import { OwnNumbers } from '@/modules/messaging/numbers';
import { LINK_TEMPLATES } from '@/modules/messaging/inbox/sales-threads/sales-threads';
import { ThreadReads } from '@/modules/messaging/inbox/reads/thread-reads';
import { MessageSearchRepo } from './message-search.repo';
import { messageSearchPage } from './message-search';

/** Which chats and rows a caller's search covers. */
interface SearchScope {
  phones: string[] | null;
  skipTemplates: string[];
}

const EMPTY: MessageSearchPage = { items: [], next_cursor: null };

/** Same visibility as reading each chat (docs/37, rule 9); keep in sync with the scopes. */
@Injectable()
export class MessageSearchService {
  constructor(
    private readonly reads: ThreadReads,
    private readonly repo: MessageSearchRepo,
    private readonly own: OwnNumbers,
  ) {}

  async search(query: MessageSearchQuery, user: AuthUser): Promise<MessageSearchPage> {
    const scope = await this.scopeOf(user);
    if (scope.phones?.length === 0) return EMPTY;
    const rows = await this.repo.search({
      q: query.q,
      ...scope,
      hide: [...(await this.own.phones())],
      before: query.cursor ? splitSearchCursor(query.cursor) : null,
      limit: MESSAGE_SEARCH_PAGE,
    });
    return messageSearchPage(rows, { q: query.q, limit: MESSAGE_SEARCH_PAGE });
  }

  private async scopeOf(user: AuthUser): Promise<SearchScope> {
    const sales = await this.reads.salesScope(user);
    if (sales) return { phones: null, skipTemplates: [...LINK_TEMPLATES] };
    const scope = await this.reads.scope(user);
    return { phones: scope ? [...scope.phones] : null, skipTemplates: [] };
  }
}
