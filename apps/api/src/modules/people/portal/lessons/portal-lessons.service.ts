import {
  isOpenLesson,
  joinWindowConfig,
  PORTAL_LESSON_DAYS,
  type PortalLessons,
  type PortalRoomLink,
  type RoomJoinResult,
} from '@ab/shared';
import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import type { AuthUser } from '@/common/auth/verify-token';
import { notFound } from '@/common/http/errors';
import { StudentLinkService } from '@/modules/teaching/classroom';
import { withRoom } from '@/modules/teaching/lessons';
import { PortalScopes } from '@/modules/people/portal/scope/portal-scope';
import { PortalLessonExtras } from './portal-lesson-extras';
import { toPortalLesson, wayIn } from './portal-lessons.mapper';
import { PortalLessonsRepo } from './portal-lessons.repo';

const DAY_MS = 86_400_000;

const MIN_MS = 60_000;

interface LessonCall {
  user: AuthUser;
  studentId: string;
}

interface RoomCall extends LessonCall {
  lessonId: string;
}

/** What StudentLinkService takes for one lesson of the login's own student. */
interface PortalRoomInput {
  lessonId: string;
  studentId: string;
  profileId: string;
  userIsTest: boolean;
}

/**
 * «الحلقات القادمة» (docs/31): the caller's student's lessons of the next PORTAL_LESSON_DAYS days (and the
 * one running now), with the way in. A classroom lesson's «ادخل الحلقة» is the student-link guest join
 * (StudentLinkService.portalJoin: same window, same (lesson, student) row, no token handed out).
 * «ما المطلوب» and this month's counts ride along (PortalLessonExtras, docs/50).
 */
@Injectable()
export class PortalLessonsService {
  constructor(
    @Inject(PortalScopes) private readonly scopes: PortalScopes,
    @Inject(PortalLessonsRepo) private readonly queries: PortalLessonsRepo,
    @Inject(StudentLinkService) private readonly rooms: StudentLinkService,
    @Inject(PortalLessonExtras) private readonly extras: PortalLessonExtras,
  ) {}

  async upcoming(call: LessonCall, now = new Date()): Promise<PortalLessons> {
    const { student, family } = await this.scopes.withFamily(call.user, call.studentId);
    const values = await this.queries.readSettings();
    const win = joinWindowConfig(values);
    const since = new Date(now.getTime() - win.closesAfterMin * MIN_MS).toISOString();
    const until = new Date(now.getTime() + PORTAL_LESSON_DAYS * DAY_MS).toISOString();
    const [rows, override, extras] = await Promise.all([
      this.queries.ahead({ studentId: call.studentId, since, until }),
      this.queries.override(call.studentId),
      this.extras.of(student, now),
    ]);
    const ctx = { academyAuto: values.meeting_link_auto, override, classroom: this.rooms.classroomReady(), win, now };
    const rooms = await this.extras.rooms(rows, { now, family });
    const lesson = (row: (typeof rows)[number]) =>
      withRoom(toPortalLesson(row, ctx), rooms);
    return { lessons: rows.map(lesson), ...extras };
  }

  /**
   * «ادخل الحلقة» of a classroom lesson: the guest admission itself (the room's token), as the student's
   * link gives it. 404 lesson_not_found / no_lesson, 409 not_classroom_lesson, 403 join_not_open_yet,
   * 410 join_closed, 429, 503 classroom_not_configured.
   */
  async join(call: RoomCall, now = new Date()): Promise<RoomJoinResult> {
    return this.rooms.portalJoin(await this.classroomLesson(call), now);
  }

  /**
   * The family app's «ادخل الحلقة» in the phone's browser (docs/50 §2, §7): a signed /join link of
   * the lesson, no second sign-in, until its room closes. Same checks as join(), before the window
   * too (the guest page refuses early joins): 404 lesson_not_found / no_lesson, 409, 410, 429, 503.
   */
  async roomLink(call: RoomCall, now = new Date()): Promise<PortalRoomLink> {
    return this.rooms.portalRoomLink(await this.classroomLesson(call), now);
  }

  /** join() and roomLink()'s guard: the login's own student, on an open classroom lesson. */
  private async classroomLesson(call: RoomCall): Promise<PortalRoomInput> {
    await this.scopes.student(call.user, call.studentId);
    const row = await this.queries.one({ studentId: call.studentId, lessonId: call.lessonId });
    if (!row) throw notFound('lesson_not_found');
    const values = await this.queries.readSettings();
    const override = await this.queries.override(call.studentId);
    if (wayIn(row, { academyAuto: values.meeting_link_auto, override, classroom: true }) !== 'classroom') {
      throw new HttpException({ code: 'not_classroom_lesson', message: 'not_classroom_lesson' }, HttpStatus.CONFLICT);
    }
    if (!isOpenLesson(row.status)) throw new HttpException({ code: 'join_closed', message: 'join_closed' }, HttpStatus.GONE);
    const userIsTest = call.user.isTest === true;
    return { lessonId: row.id, studentId: call.studentId, profileId: call.user.id, userIsTest };
  }
}
