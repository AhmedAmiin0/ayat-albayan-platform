import type { BookingResult, InstantLessonRequest, InstantLessonResult } from '@ab/shared';
import { HttpStatus, Injectable } from '@nestjs/common';
import { ConflictChecker } from '../scheduling/conflict-checker';
import { domainError } from './booking.errors';
import { meetingLinkFor } from './booking.mapper';
import { BookingQueries } from './booking.queries';
import { instantPayload, instantPlan } from './instant.plan';
import { InstantQueries } from './instant.queries';

export type InstantInput = { req: InstantLessonRequest; actorId: string };

const firstLesson = (r: BookingResult): InstantLessonResult => {
  const [first] = r.lessons;
  if (!first) throw domainError(HttpStatus.INTERNAL_SERVER_ERROR, 'no_lesson');
  return { lessonId: first.id };
};

/**
 * POST /lessons/instant («حلقة فورية», admin): ONE lesson starting now for existing students with a
 * teacher, written by the booking transaction (create_booking, through create_instant_lesson) so
 * reports, lesson numbers and teacher earnings treat it like any lesson. It is flagged instant (never
 * consumes a package unit) and its room is open at once (room_opened_at = now). Conflict-checked like
 * POST /booking: 409 conflict unless override.reason. No WhatsApp message is queued. A replay with
 * the same clientRequestId returns the first lesson (rule 8).
 */
@Injectable()
export class InstantLessonService {
  constructor(
    private readonly booking: BookingQueries,
    private readonly writes: InstantQueries,
    private readonly checker: ConflictChecker,
  ) {}

  async create({ req, actorId }: InstantInput, now = new Date()): Promise<InstantLessonResult> {
    const first = req.clientRequestId ? await this.booking.replay(req.clientRequestId) : null;
    if (first) return firstLesson(first);
    const teacher = await this.booking.teacher(req.teacherId);
    if (!teacher) throw domainError(HttpStatus.NOT_FOUND, 'teacher_not_found');
    const students = await this.booking.students(req.studentIds);
    if (students.length !== req.studentIds.length) throw domainError(HttpStatus.NOT_FOUND, 'student_not_found');
    const plan = instantPlan({ now, tz: teacher.tz, durationMin: req.durationMin });
    const conflicts = await this.checker.check({
      teacherId: teacher.id,
      studentIds: req.studentIds,
      proposed: [plan.occurrence],
      excludeIds: [],
    });
    if (conflicts.length > 0 && !req.override) throw domainError(HttpStatus.CONFLICT, 'conflict', { conflicts });
    const meetingLink = meetingLinkFor({
      overrides: students.map((s) => s.meeting_link_override),
      teacherLink: teacher.meeting_link,
    });
    const payload = instantPayload({
      plan,
      teacherId: teacher.id,
      studentIds: req.studentIds,
      conflicts,
      reason: req.override?.reason ?? null,
      meetingLink,
      clientRequestId: req.clientRequestId ?? null,
    });
    return firstLesson(await this.writes.create(payload, actorId));
  }
}
