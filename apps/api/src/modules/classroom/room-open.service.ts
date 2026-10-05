import { isOpenLesson, joinWindow, type RoomOpenResult } from '@ab/shared';
import { ForbiddenException, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import type { AuthUser } from '../../common/auth/verify-token';
import { conflict, notFound } from '../scheduling/errors';
import { ClassroomQueries } from './classroom.queries';
import { LessonRoleService } from './lesson-role.service';

/**
 * POST /lessons/:id/room/open («افتح الحلقة الآن»): the admin, or the lesson's own teacher, opens the
 * room before the usual 15 minutes. It stamps lessons.room_opened_at once (idempotent: a second call
 * keeps the first time), and the window then opens at min(room_opened_at, starts_at − 15 min) for
 * everyone, guests included. Only a lesson that can still take place (scheduled / confirmed) whose
 * room has not closed yet: 409 lesson_not_open, 410 join_closed.
 */
@Injectable()
export class RoomOpenService {
  constructor(
    private readonly roles: LessonRoleService,
    private readonly queries: ClassroomQueries,
  ) {}

  async open(input: { user: AuthUser; lessonId: string }, now = new Date()): Promise<RoomOpenResult> {
    const { lesson, role } = await this.roles.resolve(input.user, input.lessonId);
    if (role !== 'admin' && role !== 'teacher') throw new ForbiddenException();
    if (!isOpenLesson(lesson.status)) throw conflict('lesson_not_open', { status: lesson.status });
    if (joinWindow(lesson, now).state === 'closed') {
      throw new HttpException({ code: 'join_closed', message: 'join_closed' }, HttpStatus.GONE);
    }
    const opened = lesson.room_opened_at ? lesson : await this.queries.openRoom(lesson.id, now.toISOString());
    if (!opened) throw notFound('lesson_not_found');
    const at = opened.room_opened_at ?? now.toISOString();
    return { ...joinWindow({ ...opened, room_opened_at: at }, now), room_opened_at: at };
  }
}
