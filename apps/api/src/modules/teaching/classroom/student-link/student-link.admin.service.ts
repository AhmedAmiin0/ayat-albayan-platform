import type { StudentJoinLinkUrl } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { AuditService } from '../../../../common/audit/audit.service';
import { notFound } from '../../../../common/http/errors';
import { CLASSROOM_WEB_ORIGIN } from '../classroom.config';
import { hashLinkToken, newLinkToken } from '../join/join-link.token';
import { StudentLinkQueries } from './student-link.queries';

/**
 * POST /students/:id/join-link (admin) «رابط دخول الطالب»: the student's long-lived link, created on
 * the first call and rotated on every later one (only the sha256 is stored, so the URL can only be
 * shown once; a new one replaces it and the old one stops working). Audited.
 */
@Injectable()
export class StudentLinkAdminService {
  constructor(
    private readonly queries: StudentLinkQueries,
    private readonly audit: AuditService,
    @Inject(CLASSROOM_WEB_ORIGIN) private readonly origin: string,
  ) {}

  async issue(input: { studentId: string; actorId: string }): Promise<StudentJoinLinkUrl> {
    const student = await this.queries.student(input.studentId);
    if (!student) throw notFound('student_not_found');
    const token = newLinkToken();
    await this.queries.saveLink({ studentId: student.id, hash: hashLinkToken(token), actorId: input.actorId });
    await this.audit.record({ actorId: input.actorId, entity: 'students', entityId: student.id, action: 'join_link_issued', after: {} });
    return { url: `${this.origin}/s/${token}` };
  }
}
