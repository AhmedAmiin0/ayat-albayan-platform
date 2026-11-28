import {
  PORTAL_LESSON_DAYS,
  portalLessonsSchema,
  type PortalLessons,
  type PortalRoomLink,
} from '@ab/shared';
import { isOpenLesson, joinWindowConfig, type RoomJoinResult } from '@ab/schedule';
import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import type { AuthUser } from '@/common/auth/verify-token';
import { notFound } from '@/common/http/errors';
import { asResponse } from '@/common/http/returns';
import { StudentLinkService } from '@/modules/teaching/classroom';
import { withRoom } from '@/modules/teaching/lessons';
import { PortalScopes } from '@/modules/people/portal/scope/portal-scope';
import { PortalLessonExtras } from './portal-lesson-extras';
import { familyOf } from './portal-lesson-family';
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

/** docs/31: a classroom join is the student-link guest join; no token handed out. */
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
    const ctx = {
      academyAuto: values.meeting_link_auto,
      override,
      classroom: this.rooms.classroomReady(),
      win,
      now,
    };
    const rooms = await this.extras.rooms(rows, { now, family });
    const lessonIds = rows.map((r) => r.id);
    const requests = await this.queries.requests({ lessonIds, userId: call.user.id });
    const lateCancelHours = values.late_cancel_hours ?? null;
    const fam = { studentId: call.studentId, now, lateCancelHours, requests };
    const lesson = (row: (typeof rows)[number]) => ({
      ...withRoom(toPortalLesson(row, ctx), rooms),
      family: familyOf(row, fam),
    });
    return asResponse(portalLessonsSchema, { lessons: rows.map(lesson), ...extras });
  }

  async join(call: RoomCall, now = new Date()): Promise<RoomJoinResult> {
    return this.rooms.portalJoin(await this.classroomLesson(call), now);
  }

  /** docs/50 §2, §7: a signed link with no second sign-in until the room closes. */
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
