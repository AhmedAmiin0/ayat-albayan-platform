import type { ThreadDetail, ThreadView } from '@ab/shared';
import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import type { AuthUser } from '../../common/auth/verify-token';
import { ChatListsQueries } from '../chat-lists/chat-lists.queries';
import type { Page } from '../teachers/http';
import { SalesScopes, type SalesScope } from '../sales/sales-scope';
import { listFilter, withLists } from './chat-list-filter';
import { SalesThreadsService } from './sales-threads.service';
import { TeacherScopes, type TeacherScope } from './teacher-scope';
import { TeacherThreadsService } from './teacher-threads.service';
import type { ThreadListFilter } from './threads.queries';
import { ThreadsService, type ThreadPageQuery } from './threads.service';

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

  /** A chat list (`list`) narrows the admin's and sales' lists; teacher mode never has one. */
  async list(f: ThreadListFilter, user: AuthUser): Promise<Page<ThreadView>> {
    const mine = await this.salesScope(user);
    const scope = mine ? null : await this.scopes.of(user);
    if (scope) return this.teacher.list(f, scope);
    const g = await listFilter(f, { user, lists: this.chatLists });
    if (!g) return { items: [], total: 0, page: f.page, pageSize: f.pageSize };
    return mine ? this.salesService().list(g) : this.admin.list(g);
  }

  async detail(q: ThreadPageQuery, user: AuthUser): Promise<ThreadDetail> {
    const mine = await this.salesScope(user);
    const scope = mine ? null : await this.scopes.of(user);
    if (scope) return this.teacher.detail(q, scope);
    const detail = mine ? await this.salesService().detail(q) : await this.admin.detail(q);
    return withLists(detail, { user, lists: this.chatLists, phone: q.phone, first: !q.before });
  }

  private salesService(): SalesThreadsService {
    if (!this.sales) throw new ForbiddenException();
    return this.sales;
  }
}
