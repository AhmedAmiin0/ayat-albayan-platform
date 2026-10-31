import { upcomingTrial, type BookingRequest, type BookingResult, type Conflict, type TrialDateResult, type TrialHistory } from '@ab/shared';
import { HttpStatus, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { LessonEvents, type ScheduleChange } from '@/common/infra/events/lesson-events';
import { gateConfirmations } from '../../../../common/rules/confirmations';
import { NotificationPolicy } from '../../../messaging/notification-rules/policy/policy';
import { domainError } from '../booking.errors';
import { BookingFollowUps } from '../core/booking.follow-ups';
import { BookingPlanner } from '../plan/booking.planner';
import type { BookingPayload } from '@/modules/teaching/booking/core/booking.mapper';
import type { MessageDraft } from '@/modules/teaching/booking/core/booking.messages';
import { FamilyMoveNotice, familyMove, type FamilyMove } from '@/modules/teaching/schedule-notices';
import { trialHistory, trialLessonsOf } from './trial-date.history';
import { bookPick, movePick, type MovedTrial } from './trial-date.plan';
import { TrialDateQueries } from './trial-date.queries';
import { assertCanPick, targetOf, trialStudentId, type TrialTarget } from './trial-date.target';

/** What a picked date sets in motion after its commit (one injectable, so constructors stay at ≤ 3 params). */
@Injectable()
export class TrialDateDeps {
  constructor(
    readonly policy: NotificationPolicy,
    readonly after: BookingFollowUps,
    readonly events: LessonEvents,
    readonly move: FamilyMoveNotice,
  ) {}
}

/**
 * «موعد تجريبي جديد» (owner 2026-10-25, R-SCH-06, R-SCH-07, R-STU-05): a new free-trial date for one
 * existing student with no running subscription. The booking planner plans it (same teacher, slot,
 * link, conflict check and confirmation as a trial booking), skipping the upcoming trial it moves;
 * pick_trial_date writes it in one transaction (the move or the booking, status → trial, the audit
 * rows). A replay of the request id returns the first pick. Then the booking's follow-ups: the trial
 * status re-check, the teacher's new-student alert for the new lesson (also for the same teacher:
 * there is no moved-lesson notice to reuse, and the old lesson's alert goes stale) and the sender kick.
 * The old trial's queued confirmation and reminders go stale at send time (send-stale.ts).
 */
@Injectable()
export class TrialDates {
  constructor(
    private readonly queries: TrialDateQueries,
    private readonly planner: BookingPlanner,
    private readonly deps: TrialDateDeps,
  ) {}

  async history(studentId: string): Promise<TrialHistory> {
    const student = await this.queries.student(studentId);
    if (!student) throw domainError(HttpStatus.NOT_FOUND, 'student_not_found');
    const lessons = trialLessonsOf(await this.queries.trialLessons(studentId));
    const names = await this.queries.names([...new Set(lessons.flatMap((l) => (l.created_by ? [l.created_by] : [])))]);
    return trialHistory({ student, lessons, names, now: new Date() });
  }

  /** 400 trial_date_invalid, 404 student_not_found, 409 trial_date_subscribed; the trial it would move. */
  async target(req: BookingRequest): Promise<TrialTarget> {
    const studentId = trialStudentId(req);
    assertCanPick(await this.queries.student(studentId));
    const lessons = trialLessonsOf(await this.queries.trialLessons(studentId));
    const next = upcomingTrial(lessons, new Date());
    const old: MovedTrial | null = next
      ? { id: next.id, rule_id: next.rule_id, status: next.status, starts_at: next.starts_at, teacher_id: next.teacher_id, student_ids: await this.queries.lessonStudents(next.id) }
      : null;
    return targetOf({ req, studentId, old, requestId: randomUUID() });
  }

  /** The first pick of this request id for this student, if any (its idempotent trial status re-check runs again). */
  async replay(req: BookingRequest, actorId: string): Promise<TrialDateResult | null> {
    const first = req.clientRequestId ? await this.queries.replay(req.clientRequestId, trialStudentId(req)) : null;
    if (first) await this.deps.after.afterReplay({ req, result: asBooking(first, { req, alerted: [] }), actorId });
    return first;
  }

  /** POST …/trial-date/check: the clashes, the moved trial left out. */
  check({ req, old }: TrialTarget): Promise<Conflict[]> {
    return this.planner.conflicts(req, { excludeLessonIds: old ? [old.id] : [] });
  }

  /** 201 TrialDateResult; 409 conflict unless override.reason (the admin's), trial_date_subscribed, trial_changed. */
  async pick(target: TrialTarget, actorId: string): Promise<TrialDateResult> {
    const { req, old } = target;
    const prepared = await this.planner.prepare(req, { excludeLessonIds: old ? [old.id] : [] });
    const confirmations = await gateConfirmations(this.deps.policy, prepared.payload.messages);
    const gated = { ...prepared.payload, messages: confirmations };
    const family = await this.family(gated, old);
    const payload = { ...gated, messages: family.messages };
    const lessonId = req.clientRequestId;
    const pick = old ? movePick({ payload, actorId, old, lessonId }) : bookPick({ payload, actorId });
    if (!pick) throw new Error('trial date planned no lesson');
    let result: TrialDateResult;
    try {
      result = await this.queries.pick(pick);
    } catch (e) {
      // The same request twice at once: the loser (trial_changed, or the request id's unique key) finds the winner's pick.
      const first = await this.queries.replay(lessonId, trialStudentId(req));
      if (!first) throw e;
      return first;
    }
    await this.followUps({ req, result, old, actorId, familyNotice: family.familyNotice });
    return result;
  }

  /** A move: ONE family message, lesson_rescheduled or the confirmation (FamilyMoveNotice). */
  private family(p: BookingPayload, old: MovedTrial | null): Promise<FamilyMove<MessageDraft>> {
    const to = p.lessons[0]?.starts_at;
    if (!old || !to) return Promise.resolve(familyMove(false, p.messages));
    return this.deps.move.choose({ from: old.starts_at, to }, p.messages);
  }

  private async followUps(done: FollowUp): Promise<void> {
    const { req, result, old, actorId, familyNotice } = done;
    if (old) await this.deps.events.changed([old.id, result.lesson_id]);
    // The move's own notice (owner 2026-10-30): the teacher and the family hear the new time.
    if (old) await this.deps.events.scheduleChanged(movedTrial({ old, result, actorId, familyNotice }));
    // Always the new lesson's alert (dedup by its id): the old lesson's queued one goes stale, and a
    // same-teacher move has no moved-lesson notice, so this is how that teacher learns the new time.
    await this.deps.after.afterBooking({ req, result: asBooking(result, { req, alerted: [result] }), actorId });
  }
}

interface Moved {
  old: MovedTrial;
  result: TrialDateResult;
  actorId: string;
  /** FamilyMoveNotice's choice: the family hears the move by lesson_rescheduled. */
  familyNotice: boolean;
}
interface FollowUp extends Omit<Moved, 'old'> {
  req: BookingRequest;
  old: MovedTrial | null;
}

/** A trial moved to its new date: lesson_rescheduled from the old trial's start. */
function movedTrial({ old, result, actorId, familyNotice }: Moved): ScheduleChange {
  const fromStartsAt = old.starts_at;
  return { kind: 'lesson_rescheduled', lessonId: result.lesson_id, fromStartsAt, actorId, familyNotice };
}

/** The picked lesson in the BookingResult shape the booking follow-ups read (lessons: who is alerted). */
function asBooking(r: TrialDateResult, o: { req: BookingRequest; alerted: readonly TrialDateResult[] }): BookingResult {
  const lessons = o.alerted.map((l) => ({ id: l.lesson_id, starts_at: l.starts_at, ends_at: l.ends_at }));
  const studentIds = 'studentIds' in o.req ? o.req.studentIds : [];
  return { rule_id: r.lesson_id, student_ids: studentIds, guardian_ids: [], lessons, message_ids: [], invoice_id: null };
}
