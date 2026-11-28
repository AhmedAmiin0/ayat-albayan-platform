import {
  firstName,
  joinWindow,
  pickStudentLesson,
  roomNameOfStudent,
  studentJoinSchema,
} from '@ab/schedule';
import type { PortalRoomLink } from '@ab/shared';
import type { JoinWindowConfig, RoomJoinResult, StudentLinkView } from '@ab/schedule';
import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { notFound } from '@/common/http/errors';
import { parseOrThrow } from '@/common/http/http';
import { FamilyJoinLinks } from '@/modules/teaching/classroom/family-link/family-join.links';
import {
  assertNotEnded,
  assertWindowOpen,
  windowCheckFor,
} from '@/modules/teaching/classroom/join/join-gate';
import { PublicJoinLimit } from '@/modules/teaching/classroom/join/join-limit';
import {
  hashLinkToken,
  linkExpiry,
  looksLikeLinkToken,
} from '@/modules/teaching/classroom/join/join-link.token';
import { RoomAdmission } from '@/modules/teaching/classroom/join/room-admission';
import { flagsOf, type LinkStudent, type PortalLessonInput } from './student-link.flags';
import { StudentLinkRepo, type StudentLesson } from './student-link.repo';

const MS = 1000;
const ONE_DAY_S = 86_400;
interface PublicCall { token: string; ip: string }
type PortalLesson = Omit<Resolved, 'lesson'> & { lesson: StudentLesson };
interface Resolved { student: LinkStudent; lesson: StudentLesson | null; win: JoinWindowConfig }

/** The token is the whole credential; a rotated link is 404 like an unknown one; removal holds. */
@Injectable()
export class StudentLinkService {
  constructor(
    private readonly queries: StudentLinkRepo,
    private readonly limit: PublicJoinLimit,
    private readonly admission: RoomAdmission,
    @Inject(FamilyJoinLinks) private readonly family: FamilyJoinLinks,
  ) {}

  /** GET /public/student/:token. 404 link_invalid, 429. */
  async view(call: PublicCall, now = new Date()): Promise<StudentLinkView> {
    const { student, lesson, win } = await this.resolve(call, now);
    const view = lesson && {
      id: lesson.id,
      starts_at: lesson.starts_at,
      ends_at: lesson.ends_at,
      teacher_name: lesson.teacher_name,
      window: joinWindow(lesson, now, win),
    };
    return { first_name: firstName(student.name), lesson: view };
  }

  /** POST /public/student/:token/join. 404 link_invalid / no_lesson, 403 join_not_open_yet (opens_at) / removed_from_room, 410, 429, 503. */
  async join(call: PublicCall & { body: unknown }, now = new Date()): Promise<RoomJoinResult> {
    this.limit.assert({ ip: call.ip, token: call.token }, now.getTime());
    this.admission.livekit();
    const { name } = parseOrThrow(studentJoinSchema, call.body ?? {});
    const { student, lesson, win } = await this.resolve(call, now, false);
    if (!lesson) throw notFound('no_lesson');
    assertWindowOpen(lesson, now, win);
    return this.admitTo({ lesson, student, win, now, ...(name && { name }) });
  }

  /** Family portal join (docs/31): ownership checked by caller; test logins skip window. */
  async portalJoin(input: PortalLessonInput, now = new Date()): Promise<RoomJoinResult> {
    const key = { ip: `portal:${input.profileId}`, token: input.lessonId, userIsTest: input.userIsTest };
    this.limit.assert(key, now.getTime());
    const { student, lesson, win } = await this.portalLesson(input, now);
    windowCheckFor(flagsOf(input, student))(lesson, now, win);
    return this.admitTo({ lesson, student, win, now });
  }

  /**
   * The family app's browser link (docs/50 §2, §7): a signed /join link of ONE lesson of that
   * student until its room closes, taken by the guest page through portalJoin's row. Issued before
   * the window too (the page refuses early joins). 404 no_lesson, 410 lesson_ended, 429, 503.
   */
  async portalRoomLink(input: PortalLessonInput, now = new Date()): Promise<PortalRoomLink> {
    const key = { ip: `portal-link:${input.profileId}`, token: input.lessonId, userIsTest: input.userIsTest };
    this.limit.assert(key, now.getTime());
    const { lesson, win } = await this.portalLesson(input, now);
    assertNotEnded(lesson);
    const closesAt = linkExpiry(lesson, win);
    return this.family.issue({ lessonId: lesson.id, studentId: input.studentId, closesAt });
  }

  /** The student and ONE of their lessons whose room has not closed yet. 404 no_lesson, 503. */
  private async portalLesson(input: PortalLessonInput, now: Date): Promise<PortalLesson> {
    this.admission.livekit();
    const [student, win, ahead] = await Promise.all([
      this.queries.student(input.studentId),
      this.queries.joinWindow(),
      this.queries.lessonsAhead(input.studentId, now),
    ]);
    const lesson = ahead.find((l) => l.id === input.lessonId);
    if (!student || !lesson) throw notFound('no_lesson');
    return { student, lesson, win };
  }

  /** LIVEKIT_* configured: the portal offers our classroom only then (as the reminders do). */
  classroomReady(): boolean {
    try {
      this.admission.livekit();
      return true;
    } catch {
      return false;
    }
  }

  private async admitTo(input: {
    lesson: StudentLesson;
    student: LinkStudent;
    win: JoinWindowConfig;
    now: Date;
    name?: string;
  }): Promise<RoomJoinResult> {
    const { lesson, student, win, now } = input;
    const joinLinkId = await this.queries.lessonLinkId({ lesson, studentId: student.id });
    const closesS =
      Math.floor(Date.parse(joinWindow(lesson, now, win).closes_at) / MS) -
      Math.floor(now.getTime() / MS);
    const shown = input.name?.slice(0, 30) ?? roomNameOfStudent(student.name);
    return this.admission.admit(
      { lessonId: lesson.id, role: 'guest', name: shown, principal: { joinLinkId }, ttlSeconds: Math.min(closesS, ONE_DAY_S) },
      now,
    );
  }

  private async resolve(call: PublicCall, now: Date, read = true): Promise<Resolved> {
    // The join counted itself already; a page read has its own polling budget (assertRead).
    if (read) this.limit.assertRead({ ip: call.ip, token: call.token }, now.getTime());
    if (!looksLikeLinkToken(call.token)) throw notFound('link_invalid');
    const link = await this.queries.linkByHash(hashLinkToken(call.token));
    if (!link) throw notFound('link_invalid');
    if (link.revoked_at) throw new HttpException({ code: 'link_expired', message: 'link_expired' }, HttpStatus.GONE);
    const student = await this.queries.student(link.student_id);
    if (!student) throw notFound('link_invalid');
    const win = await this.queries.joinWindow();
    const lesson = pickStudentLesson(await this.queries.lessonsAhead(student.id, now), now, win);
    return { student, lesson, win };
  }
}
