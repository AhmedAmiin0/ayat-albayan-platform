import type { ThreadDetail, ThreadView } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import type { AuthUser } from '../../common/auth/verify-token';
import type { Page } from '../teachers/http';
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
  constructor(
    private readonly admin: ThreadsService,
    private readonly teacher: TeacherThreadsService,
    private readonly scopes: TeacherScopes,
  ) {}

  /** null for an admin; a teacher's scope (404 teacher_not_linked without a teachers row). */
  scope(user: AuthUser): Promise<TeacherScope | null> {
    return this.scopes.of(user);
  }

  async list(f: ThreadListFilter, user: AuthUser): Promise<Page<ThreadView>> {
    const scope = await this.scopes.of(user);
    return scope ? this.teacher.list(f, scope) : this.admin.list(f);
  }

  async detail(q: ThreadPageQuery, user: AuthUser): Promise<ThreadDetail> {
    const scope = await this.scopes.of(user);
    return scope ? this.teacher.detail(q, scope) : this.admin.detail(q);
  }
}
