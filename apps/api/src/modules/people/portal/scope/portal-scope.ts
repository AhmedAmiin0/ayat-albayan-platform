import type { PortalStudent } from '@ab/shared';
import { ForbiddenException, Injectable } from '@nestjs/common';
import type { AuthUser } from '@/common/auth/verify-token';
import { notFound } from '@/common/http/errors';
import { PortalScopeRepo } from './portal-scope.repo';

/** A login's student and the ids of all its students. */
interface StudentInFamily {
  student: PortalStudent;
  family: string[];
}

interface PortalScope {
  kind: 'guardian' | 'student';
  students: PortalStudent[];
}

/**
 * Who a portal login may see (docs/31, rule 9): a guardian their own students, a student only
 * themself. Every /portal/students/:id route resolves the student here first; anyone else's id is
 * 404 student_not_found (the same answer as an unknown id, so ids of other families are not
 * confirmed).
 */
@Injectable()
export class PortalScopes {
  constructor(private readonly queries: PortalScopeRepo) {}

  async of(user: AuthUser): Promise<PortalScope> {
    if (user.role !== 'guardian' && user.role !== 'student') throw new ForbiddenException();
    return { kind: user.role, students: await this.queries.studentsOf(user.id) };
  }

  async student(user: AuthUser, studentId: string): Promise<PortalStudent> {
    return (await this.withFamily(user, studentId)).student;
  }

  /** The student, and the ids of every student of this login (its family). 404 as student(). */
  async withFamily(user: AuthUser, studentId: string): Promise<StudentInFamily> {
    const { students } = await this.of(user);
    const found = students.find((s) => s.id === studentId);
    if (!found) throw notFound('student_not_found');
    return { student: found, family: students.map((s) => s.id) };
  }
}
