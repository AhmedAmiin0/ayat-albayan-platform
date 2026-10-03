import { lessonRoomName, type JoinRole, type RoomJoinResult } from '@ab/shared';
import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import type { AuthUser } from '../../common/auth/verify-token';
import { notFound } from '../scheduling/errors';
import { TeachersQueries } from '../teachers/teachers.queries';
import { CLASSROOM_CONFIG, type ClassroomConfig } from './classroom.config';
import { ClassroomQueries, type JoinLesson } from './classroom.queries';
import { assertWindowOpen, notConfigured } from './join-gate';
import { mintToken, newIdentity } from './livekit-token';

/**
 * POST /lessons/:id/room/join. Who may enter (rule 9, the API being the only gate to the room):
 * any admin; the teacher of that lesson; an assistant assigned to one of its students; a salesperson for a trial booked from one of their
 * leads (sales-lessons.ts). Nobody else,
 * guardians included (they come by the guest link). The window (15 minutes before to 2 hours after)
 * binds teachers, assistants and salespeople; an admin may always enter, to supervise or to help.
 */
@Injectable()
export class RoomJoinService {
  constructor(
    private readonly queries: ClassroomQueries,
    private readonly teachers: TeachersQueries,
    @Inject(CLASSROOM_CONFIG) private readonly config: ClassroomConfig,
  ) {}

  async join(input: { user: AuthUser; lessonId: string }, now = new Date()): Promise<RoomJoinResult> {
    if (!this.config) throw notConfigured();
    const lesson = await this.queries.lesson(input.lessonId);
    if (!lesson) throw notFound('lesson_not_found');
    const role = await this.roleOf(input.user, lesson);
    if (role !== 'admin') assertWindowOpen(lesson, now);
    const name = await this.nameOf(input.user, { role, lesson });
    const room = lessonRoomName(lesson.id);
    const token = mintToken(this.config, { room, role, name, identity: newIdentity(role) }, now);
    return { url: this.config.url, token, room, role };
  }

  private async roleOf(user: AuthUser, lesson: JoinLesson): Promise<Exclude<JoinRole, 'guest'>> {
    if (user.role === 'admin') return 'admin';
    if (user.role === 'teacher' && (await this.teachers.idByProfile(user.id)) === lesson.teacher_id) return 'teacher';
    if (user.role === 'assistant' && (await this.queries.assistsLesson(user.id, lesson.id))) return 'assistant';
    if (user.role === 'sales' && (await this.queries.salesOwnsLesson(user.id, lesson.id))) return 'sales';
    throw new ForbiddenException();
  }

  private async nameOf(user: AuthUser, ctx: { role: JoinRole; lesson: JoinLesson }): Promise<string> {
    const teacher = ctx.role === 'teacher' ? await this.queries.teacherName(ctx.lesson.teacher_id) : null;
    return (teacher ?? (await this.queries.profileName(user.id)) ?? ctx.role).slice(0, 30);
  }
}
