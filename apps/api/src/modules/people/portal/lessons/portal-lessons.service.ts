import { isOpenLesson, joinWindowConfig, PORTAL_LESSON_DAYS, type PortalLessons, type RoomJoinResult } from '@ab/shared';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import type { AuthUser } from '../../../../common/auth/verify-token';
import { notFound } from '../../../../common/http/errors';
import { StudentLinkService } from '../../../teaching/classroom';
import { PortalScopes } from '../scope/portal-scope';
import { toPortalLesson, wayIn } from './portal-lessons.mapper';
import { PortalLessonsQueries } from './portal-lessons.queries';

const DAY_MS = 86_400_000;
const MIN_MS = 60_000;

interface LessonCall {
  user: AuthUser;
  studentId: string;
}

/**
 * «الحلقات القادمة» (docs/31): the caller's student's lessons of the next PORTAL_LESSON_DAYS days (and the
 * one running now), with the way in. A classroom lesson's «ادخل الحلقة» is the student-link guest join
 * (StudentLinkService.portalJoin: same window, same (lesson, student) row, no token handed out).
 */
@Injectable()
export class PortalLessonsService {
  constructor(
    private readonly scopes: PortalScopes,
    private readonly queries: PortalLessonsQueries,
    private readonly rooms: StudentLinkService,
  ) {}

  async upcoming(call: LessonCall, now = new Date()): Promise<PortalLessons> {
    await this.scopes.student(call.user, call.studentId);
    const values = await this.queries.readSettings();
    const win = joinWindowConfig(values);
    const since = new Date(now.getTime() - win.closesAfterMin * MIN_MS).toISOString();
    const until = new Date(now.getTime() + PORTAL_LESSON_DAYS * DAY_MS).toISOString();
    const [rows, override] = await Promise.all([
      this.queries.ahead({ studentId: call.studentId, since, until }),
      this.queries.override(call.studentId),
    ]);
    const ctx = { academyAuto: values.meeting_link_auto, override, classroom: this.rooms.classroomReady(), win, now };
    return { lessons: rows.map((row) => toPortalLesson(row, ctx)) };
  }

  /**
   * «ادخل الحلقة» of a classroom lesson: the guest admission itself (the room's token), as the student's
   * link gives it. 404 lesson_not_found / no_lesson, 409 not_classroom_lesson, 403 join_not_open_yet,
   * 410 join_closed, 429, 503 classroom_not_configured.
   */
  async join(call: LessonCall & { lessonId: string }, now = new Date()): Promise<RoomJoinResult> {
    await this.scopes.student(call.user, call.studentId);
    const row = await this.queries.one({ studentId: call.studentId, lessonId: call.lessonId });
    if (!row) throw notFound('lesson_not_found');
    const values = await this.queries.readSettings();
    const override = await this.queries.override(call.studentId);
    if (wayIn(row, { academyAuto: values.meeting_link_auto, override, classroom: true }) !== 'classroom') {
      throw new HttpException({ code: 'not_classroom_lesson', message: 'not_classroom_lesson' }, HttpStatus.CONFLICT);
    }
    if (!isOpenLesson(row.status)) throw new HttpException({ code: 'join_closed', message: 'join_closed' }, HttpStatus.GONE);
    return this.rooms.portalJoin({ lessonId: row.id, studentId: call.studentId, profileId: call.user.id }, now);
  }
}
