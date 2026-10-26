import type { JoinRole } from '@ab/shared';
import { ForbiddenException, Injectable } from '@nestjs/common';
import type { AuthUser } from '../../../../common/auth/verify-token';
import { notFound } from '../../../../common/http/errors';
import { TeachersQueries } from '../../../people/teachers/teachers.queries';
import { ClassroomQueries, type JoinLesson } from '../classroom.queries';

export type StaffRole = Exclude<JoinRole, 'guest'>;

/**
 * A login's role in one lesson's room (rule 9, the API being the only gate): any admin; the
 * teacher of that lesson; an assistant assigned to one of its students; a salesperson as `sales` for a
 * trial booked from one of their leads (sales-lessons.ts) and as `assistant` for any other lesson
 * (docs/16: sales also do the assistant's job). Nobody else, guardians included (they come
 * by the guest link). Shared by joining, removing someone, and the recordings list.
 */
@Injectable()
export class LessonRoleService {
  constructor(
    private readonly queries: ClassroomQueries,
    private readonly teachers: TeachersQueries,
  ) {}

  /** 404 lesson_not_found, 403 when the login has no role in this lesson. */
  async resolve(user: AuthUser, lessonId: string): Promise<{ lesson: JoinLesson; role: StaffRole }> {
    const lesson = await this.queries.lesson(lessonId);
    if (!lesson) throw notFound('lesson_not_found');
    return { lesson, role: await this.roleOf(user, lesson) };
  }

  /** The name shown in the room: the teacher's display name, else the profile name, else the role. */
  async nameOf(user: AuthUser, ctx: { role: JoinRole; lesson: JoinLesson }): Promise<string> {
    const teacher = ctx.role === 'teacher' ? await this.queries.teacherName(ctx.lesson.teacher_id) : null;
    return (teacher ?? (await this.queries.profileName(user.id)) ?? ctx.role).slice(0, 30);
  }

  private async roleOf(user: AuthUser, lesson: JoinLesson): Promise<StaffRole> {
    if (user.role === 'admin') return 'admin';
    if (user.role === 'teacher' && (await this.teachers.idByProfile(user.id)) === lesson.teacher_id) return 'teacher';
    if (user.role === 'assistant' && (await this.queries.assistsLesson(user.id, lesson.id))) return 'assistant';
    // docs/16: a salesperson is also the academy's classroom assistant: her own trial as sales, any other lesson as assistant.
    if (user.role === 'sales') return (await this.queries.salesOwnsLesson(user.id, lesson.id)) ? 'sales' : 'assistant';
    throw new ForbiddenException();
  }
}
