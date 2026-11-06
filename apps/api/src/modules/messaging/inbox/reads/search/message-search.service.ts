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

/**
 * «بحث في كل الرسائل» (owner 2026-11-06, docs/37) with the same visibility as reading each chat,
 * resolved per request in ThreadReads.list's order (rule 9): a salesperson every chat without the
 * link templates (SalesScope, owner 2026-10-11); the admin every chat; a teacher only her scope's
 * phones (her families and her own read-only chat; an empty scope reads nothing); any other role
 * 403 and an unlinked teacher 404 (TeacherScopes.of). The academy's own numbers are hidden for all.
 * Any change to SalesScope / TeacherScope must change this too (its tests pin every role).
 */
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
