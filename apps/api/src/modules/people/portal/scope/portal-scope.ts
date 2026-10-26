import type { PortalStudent } from '@ab/shared';
import { ForbiddenException, Injectable } from '@nestjs/common';
import type { AuthUser } from '../../../../common/auth/verify-token';
import { notFound } from '../../../../common/http/errors';
import { PortalScopeQueries } from './portal-scope.queries';

export interface PortalScope {
  kind: 'guardian' | 'student';
  students: PortalStudent[];
}

/**
 * Who a portal login may see (docs/31, rule 9): a guardian their own students, a student only themself.
 * Every /portal/students/:id route resolves the student here first; anyone else's id is 404
 * student_not_found (the same answer as an unknown id, so ids of other families are not confirmed).
 */
@Injectable()
export class PortalScopes {
  constructor(private readonly queries: PortalScopeQueries) {}

  async of(user: AuthUser): Promise<PortalScope> {
    if (user.role !== 'guardian' && user.role !== 'student') throw new ForbiddenException();
    return { kind: user.role, students: await this.queries.studentsOf(user.id) };
  }

  async student(user: AuthUser, studentId: string): Promise<PortalStudent> {
    const found = (await this.of(user)).students.find((s) => s.id === studentId);
    if (!found) throw notFound('student_not_found');
    return found;
  }
}
