import { type StudentRecordingsPage, type StudentRecordingsQuery } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import type { AuthUser } from '@/common/auth/verify-token';
import { RecordingViews } from '@/modules/teaching/classroom/recordings/recording-list.service';
import { StudentRecordingAccess } from './student-recordings.access';
import { canManage, studentRecordingView, type ManageRule, type RecordingJoinRow } from './student-recordings.mapper';
import { StudentRecordingRepo } from './student-recordings.repo';

/** GET /students/:id/recordings: the file of one student, newest first, 1-hour signed links. */
@Injectable()
export class StudentRecordingsService {
  constructor(
    private readonly access: StudentRecordingAccess,
    private readonly queries: StudentRecordingRepo,
    private readonly views: RecordingViews,
  ) {}

  /** 404 student_not_found, 403 outside the login's scope (see StudentRecordingAccess). */
  async list(input: { user: AuthUser; studentId: string; query: StudentRecordingsQuery }): Promise<StudentRecordingsPage> {
    const { onlyTeacherId, manage } = await this.access.scopeFor(input.user, input.studentId);
    const { rows, total } = await this.queries.page({ studentId: input.studentId, onlyTeacherId, query: input.query });
    return { items: await this.signed(rows, manage), total, page: input.query.page, pageSize: input.query.pageSize };
  }

  /** GET /students/:id/recorded-lesson-ids: same access as list(), but no link is signed. */
  async recordedLessonIds(input: { user: AuthUser; studentId: string }): Promise<string[]> {
    const { onlyTeacherId } = await this.access.scopeFor(input.user, input.studentId);
    return this.queries.doneLessonIds({ studentId: input.studentId, onlyTeacherId });
  }

  private signed(rows: RecordingJoinRow[], manage: ManageRule) {
    return Promise.all(
      rows.map(async (row) =>
        studentRecordingView(row, { url: row.status === 'done' ? await this.views.urlOf(row) : null, canManage: canManage(manage, row) }),
      ),
    );
  }
}
