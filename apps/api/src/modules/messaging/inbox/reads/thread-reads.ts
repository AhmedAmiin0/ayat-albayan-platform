import type { ThreadDetail, ThreadView } from '@ab/shared';
import { ForbiddenException, Inject, Injectable, Optional } from '@nestjs/common';
import type { AuthUser } from '../../../../common/auth/verify-token';
import { ChatListsQueries } from '../../chat-lists/chat-lists.queries';
import { OwnNumbers } from '../../numbers';
import type { Page } from '../../../../common/http/http';
import { SalesScopes, type SalesScope } from '../../../sales/sales/sales-scope';
import { listFilter, withLists } from '../threads/chat-list-filter';
import { SalesThreadsService } from '../sales-threads/sales-threads.service';
import { TeacherScopes, type TeacherScope } from '../teacher-threads/teacher-scope';
import { TeacherThreadsService } from '../teacher-threads/teacher-threads.service';
import { ThreadQuotes } from '../threads/thread-quotes';
import { ThreadsQueries, type ThreadListFilter } from '../threads/threads.queries';
import { threadReactable } from '../reactions/reaction-line';
import { ThreadsService, type ThreadPageQuery } from '../threads/threads.service';

/**
 * H1/H2 for whoever is signed in: the admin's inbox (ThreadsService), a salesperson's (every chat,
 * redacted: SalesThreadsService) or a teacher's own families (TeacherThreadsService). The scope is
 * resolved server-side on every request (rule 9).
 */
@Injectable()
export class ThreadReads {
  /** Sales mode (property-injected: the constructor is at the 3-parameter limit). */
  @Inject(SalesThreadsService) private readonly sales?: SalesThreadsService;
  @Inject(SalesScopes) private readonly salesScopes?: SalesScopes;
  /** «القوائم» (docs/22): the list filter and the open chat's lists (admin and sales only). */
  @Inject(ChatListsQueries) private readonly chatLists?: ChatListsQueries;
  /** «رد»: the messages a page's bubbles answer (owner 2026-10-25). */
  @Inject(ThreadQuotes) private readonly quotes?: ThreadQuotes;
  /** The academy's own numbers: never listed, for any role (owner 2026-10-27). */
  @Optional() @Inject(OwnNumbers) private readonly own?: OwnNumbers;
  /** «تفاعل»: the first page's `reactable` (the chat's send line, migration 900). */
  @Optional() @Inject(ThreadsQueries) private readonly rows?: ThreadsQueries;

  constructor(
    private readonly admin: ThreadsService,
    private readonly teacher: TeacherThreadsService,
    private readonly scopes: TeacherScopes,
  ) {}

  /** null for an admin; a teacher's scope (404 teacher_not_linked without a teachers row). */
  scope(user: AuthUser): Promise<TeacherScope | null> {
    return this.scopes.of(user);
  }

  /** A salesperson's scope (every chat, sales redactions); null for every other role. */
  salesScope(user: AuthUser): Promise<SalesScope | null> {
    return this.salesScopes ? this.salesScopes.of(user) : Promise.resolve(null);
  }

  /**
   * A chat list (`list`) narrows the admin's and sales' lists; teacher mode never has one. The academy's
   * own numbers are hidden from every list, search and unread count (the nav counts read this total).
   */
  async list(input: ThreadListFilter, user: AuthUser): Promise<Page<ThreadView>> {
    const f = await this.withoutOwn(input);
    const mine = await this.salesScope(user);
    const scope = mine ? null : await this.scopes.of(user);
    if (scope) return this.teacher.list(f, scope);
    const g = listFilter(f, user);
    if (!g) return { items: [], total: 0, page: f.page, pageSize: f.pageSize };
    return mine ? this.salesService().list(g) : this.admin.list(g);
  }

  async detail(q: ThreadPageQuery, user: AuthUser): Promise<ThreadDetail> {
    const mine = await this.salesScope(user);
    const scope = mine ? null : await this.scopes.of(user);
    if (scope) return this.reactable(await this.quoted(await this.teacher.detail(q, scope), q.phone), q.phone !== scope.ownPhone);
    const detail = mine ? await this.salesService().detail(q) : await this.admin.detail(q);
    const listed = await withLists(await this.quoted(detail, q.phone), { user, lists: this.chatLists, phone: q.phone, first: !q.before });
    return this.reactable(listed, true);
  }

  /** thread.reactable: may this caller's bubbles offer «تفاعل» (a teacher never on their own chat). */
  private async reactable(detail: ThreadDetail, may: boolean): Promise<ThreadDetail> {
    if (!detail.thread || !this.rows) return detail;
    const reactable = may && (await threadReactable(this.rows, detail.thread.phone_e164, new Date()));
    return { ...detail, thread: { ...detail.thread, reactable } };
  }

  private async withoutOwn(f: ThreadListFilter): Promise<ThreadListFilter> {
    const own = this.own ? await this.own.phones() : new Set<string>();
    return own.size > 0 ? { ...f, hide: [...own] } : f;
  }

  private async quoted(detail: ThreadDetail, phone: string): Promise<ThreadDetail> {
    return this.quotes ? { ...detail, messages: await this.quotes.attach(detail.messages, phone) } : detail;
  }

  private salesService(): SalesThreadsService {
    if (!this.sales) throw new ForbiddenException();
    return this.sales;
  }
}
