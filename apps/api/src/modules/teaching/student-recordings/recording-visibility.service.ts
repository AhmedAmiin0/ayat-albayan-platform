import { ForbiddenException, Injectable } from '@nestjs/common';
import { AuditService } from '@/common/audit/audit.service';
import type { AuthUser } from '@/common/auth/verify-token';
import { conflict, notFound } from '@/common/http/errors';
import { TeachersRepo } from '@/modules/people/teachers/teachers.repo';
import { RecordingAdminRepo, type RecordingWithTeacher } from './recording-admin.repo';

/**
 * PATCH /recordings/:id/visibility: admin any recording; a teacher only their own lessons'. A group
 * lesson's recording is one file of every student's session: it cannot be shown (409 recording_group_lesson).
 */
@Injectable()
export class RecordingVisibilityService {
  constructor(
    private readonly queries: RecordingAdminRepo,
    private readonly teachers: TeachersRepo,
    private readonly audit: AuditService,
  ) {}

  async setVisibility(input: { user: AuthUser; id: string; visible: boolean }): Promise<{ id: string; visible_to_student: boolean }> {
    const row = await this.queries.byId(input.id);
    if (!row) throw notFound('recording_not_found');
    await this.assertMay(input.user, row);
    if (row.status === 'deleted') throw conflict('recording_deleted');
    if (row.visible_to_student !== input.visible) {
      if (input.visible && row.lesson_id && (await this.queries.attendeeCount(row.lesson_id)) > 1) throw conflict('recording_group_lesson');
      await this.queries.setVisible(row.id, input.visible);
      await this.audit.record({
        actorId: input.user.id,
        entity: 'lesson_recordings',
        entityId: row.id,
        action: 'visibility_change',
        before: { visible_to_student: row.visible_to_student },
        after: { visible_to_student: input.visible },
      });
    }
    return { id: row.id, visible_to_student: input.visible };
  }

  private async assertMay(user: AuthUser, row: RecordingWithTeacher): Promise<void> {
    if (user.role === 'admin') return;
    const teacherId = user.role === 'teacher' ? await this.teachers.idByProfile(user.id) : null;
    if (teacherId && row.lessons?.teacher_id === teacherId) return;
    throw new ForbiddenException();
  }
}
