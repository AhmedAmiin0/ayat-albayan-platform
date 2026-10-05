import { type StudentRecordingsPage, type StudentRecordingsQuery } from '@ab/shared';
import { ForbiddenException, Injectable } from '@nestjs/common';
import type { AuthUser } from '../../common/auth/verify-token';
import { RecordingViews } from '../classroom/recording-list.service';
import { StudentRecordingAccess } from './student-recordings.access';
import { canManage, studentRecordingView, type ManageRule, type RecordingJoinRow } from './student-recordings.mapper';
import { StudentRecordingQueries } from './student-recordings.queries';

/** GET /students/:id/recordings: the file of one student, newest first, 1-hour signed links. */
@Injectable()
export class StudentRecordingsService {
  constructor(
    private readonly access: StudentRecordingAccess,
    private readonly queries: StudentRecordingQueries,
    private readonly views: RecordingViews,
  ) {}

  /** 404 student_not_found, 403 outside the login's scope (see StudentRecordingAccess). */
  async list(input: { user: AuthUser; studentId: string; query: StudentRecordingsQuery }): Promise<StudentRecordingsPage> {
    const { onlyTeacherId, manage } = await this.access.scopeFor(input.user, input.studentId);
    const { rows, total } = await this.queries.page({ studentId: input.studentId, onlyTeacherId, query: input.query });
    return { items: await this.signed(rows, manage), total, page: input.query.page, pageSize: input.query.pageSize };
  }

  /**
   * Not routed yet (owner: the student/guardian portal comes later): a guardian's page for one of
   * their own children, only recordings staff made visible. Any other login is refused.
   */
  async listForGuardian(input: { user: AuthUser; studentId: string; query: StudentRecordingsQuery }): Promise<StudentRecordingsPage> {
    const own = input.user.role === 'guardian' ? await this.queries.studentIdsOfGuardian(input.user.id) : [];
    if (!own.includes(input.studentId)) throw new ForbiddenException();
    const { rows, total } = await this.queries.page({ studentId: input.studentId, onlyTeacherId: null, guardianView: true, query: input.query });
    return { items: await this.signed(rows, 'none'), total, page: input.query.page, pageSize: input.query.pageSize };
  }

  private signed(rows: RecordingJoinRow[], manage: ManageRule) {
    return Promise.all(
      rows.map(async (row) =>
        studentRecordingView(row, { url: row.status === 'done' ? await this.views.urlOf(row) : null, canManage: canManage(manage, row) }),
      ),
    );
  }
}
