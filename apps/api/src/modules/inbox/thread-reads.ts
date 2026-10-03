import type { ThreadDetail, ThreadView } from '@ab/shared';
import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import type { AuthUser } from '../../common/auth/verify-token';
import type { Page } from '../teachers/http';
import { SalesScopes, type SalesScope } from '../sales/sales-scope';
import { SalesThreadsService } from './sales-threads.service';
import { TeacherScopes, type TeacherScope } from './teacher-scope';
import { TeacherThreadsService } from './teacher-threads.service';
import type { ThreadListFilter } from './threads.queries';
import { ThreadsService, type ThreadPageQuery } from './threads.service';

/**
 * H1/H2 for whoever is signed in: the admin's inbox (ThreadsService), or a teacher's own families
 * (TeacherThreadsService). The scope is resolved server-side on every request (rule 9).
 */
@Injectable()
export class ThreadReads {
  /** Sales mode (property-injected: the constructor is at the 3-parameter limit). */
  @Inject(SalesThreadsService) private readonly sales?: SalesThreadsService;
  @Inject(SalesScopes) private readonly salesScopes?: SalesScopes;

  constructor(
    private readonly admin: ThreadsService,
    private readonly teacher: TeacherThreadsService,
    private readonly scopes: TeacherScopes,
  ) {}

  /** null for an admin; a teacher's scope (404 teacher_not_linked without a teachers row). */
  scope(user: AuthUser): Promise<TeacherScope | null> {
    return this.scopes.of(user);
  }

  /** A salesperson's scope (their leads' and converted families' phones); null for every other role. */
  salesScope(user: AuthUser): Promise<SalesScope | null> {
    return this.salesScopes ? this.salesScopes.of(user) : Promise.resolve(null);
  }

  async list(f: ThreadListFilter, user: AuthUser): Promise<Page<ThreadView>> {
    const mine = await this.salesScope(user);
    if (mine) return this.salesService().list(f, mine);
    const scope = await this.scopes.of(user);
    return scope ? this.teacher.list(f, scope) : this.admin.list(f);
  }

  async detail(q: ThreadPageQuery, user: AuthUser): Promise<ThreadDetail> {
    const mine = await this.salesScope(user);
    if (mine) return this.salesService().detail(q, mine);
    const scope = await this.scopes.of(user);
    return scope ? this.teacher.detail(q, scope) : this.admin.detail(q);
  }

  private salesService(): SalesThreadsService {
    if (!this.sales) throw new ForbiddenException();
    return this.sales;
  }
}
