import {
  firstName,
  joinWindow,
  pickStudentLesson,
  studentJoinSchema,
  type JoinWindowConfig,
  type RoomJoinResult,
  type StudentLinkView,
} from '@ab/shared';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { notFound } from '../../../../common/http/errors';
import { parseOrThrow } from '../../../../common/http/http';
import { assertWindowOpen } from '../join/join-gate';
import { PublicJoinLimit } from '../join/join-limit';
import { hashLinkToken, looksLikeLinkToken } from '../join/join-link.token';
import { RoomAdmission } from '../join/room-admission';
import { StudentLinkQueries, type StudentLesson } from './student-link.queries';

const MS = 1000;
const ONE_DAY_S = 86_400;

export type PublicCall = { token: string; ip: string };
type Resolved = { student: { id: string; name: string }; lesson: StudentLesson | null; win: JoinWindowConfig };

/**
 * The student's own link (/s/<token>, no login): «حلقتك القادمة …» and «ادخل الحلقة» for whichever
 * lesson is current or next (pickStudentLesson). The token is the whole credential; a rotated link
 * is refused 404 link_invalid like an unknown one. The join is the guest join of that lesson, through
 * the one lesson_join_links row of (lesson, student), so «إخراج من الحلقة» holds (403 removed_from_room).
 * The join counts against the public join limit, page reads (polled every 30 s) against a looser one (429).
 */
@Injectable()
export class StudentLinkService {
  constructor(
    private readonly queries: StudentLinkQueries,
    private readonly limit: PublicJoinLimit,
    private readonly admission: RoomAdmission,
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
    const joinLinkId = await this.queries.lessonLinkId({ lesson, studentId: student.id });
    const closesS = Math.floor(Date.parse(joinWindow(lesson, now, win).closes_at) / MS) - Math.floor(now.getTime() / MS);
    const shown = (name ?? (firstName(student.name) || student.name)).slice(0, 30);
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
