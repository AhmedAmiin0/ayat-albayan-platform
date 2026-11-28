import { isOpenLesson, joinWindow, type RoomOpenResult } from '@ab/schedule';
import { ForbiddenException, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import type { AuthUser } from '@/common/auth/verify-token';
import { conflict, notFound } from '@/common/http/errors';
import { ClassroomRepo } from '@/modules/teaching/classroom/classroom.repo';
import { LessonRoleService } from './lesson-role.service';

/** Stamped once; window opens at min(room_opened_at, starts_at - 15 min); 409 or 410 otherwise. */
@Injectable()
export class RoomOpenService {
  constructor(
    private readonly roles: LessonRoleService,
    private readonly queries: ClassroomRepo,
  ) {}

  async open(
    input: { user: AuthUser; lessonId: string },
    now = new Date(),
  ): Promise<RoomOpenResult> {
    const { lesson, role } = await this.roles.resolve(input.user, input.lessonId);
    if (role !== 'admin' && role !== 'teacher') throw new ForbiddenException();
    if (!isOpenLesson(lesson.status)) throw conflict('lesson_not_open', { status: lesson.status });
    const win = await this.queries.joinWindow();
    if (joinWindow(lesson, now, win).state === 'closed') {
      throw new HttpException({ code: 'join_closed', message: 'join_closed' }, HttpStatus.GONE);
    }
    const opened = lesson.room_opened_at
      ? lesson
      : await this.queries.openRoom(lesson.id, now.toISOString());
    if (!opened) throw notFound('lesson_not_found');
    const at = opened.room_opened_at ?? now.toISOString();
    return { ...joinWindow({ ...opened, room_opened_at: at }, now, win), room_opened_at: at };
  }
}
