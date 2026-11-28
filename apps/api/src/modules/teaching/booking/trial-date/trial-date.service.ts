import {
  trialHistorySchema,
  upcomingTrial,
  type BookingRequest,
  type TrialDateResult,
  type TrialHistory,
} from '@ab/shared';
import type { BookingResult, Conflict } from '@ab/schedule';
import { HttpStatus, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { asResponse } from '@/common/http/returns';
import { gateConfirmations } from '@/common/rules/confirmations';
import { BookingPlanner } from '@/modules/teaching/booking/plan/booking.planner';
import type { BookingPayload } from '@/modules/teaching/booking/core/booking.mapper';
import type { MessageDraft } from '@/modules/teaching/booking/core/booking.messages';
import { familyMove, type FamilyMove } from '@/modules/teaching/schedule-notices';
import { trialHistory, trialLessonsOf } from './trial-date.history';
import { bookPick, movePick, type MovedTrial } from './trial-date.plan';
import { TrialDateDeps } from './trial-date.deps';
import { movedFrom, movedTrial } from './trial-date.moved';
import { TrialDateRepo } from './trial-date.repo';
import { assertCanPick, targetOf, trialStudentId, type TrialTarget } from './trial-date.target';
import { httpError } from '@/common/http/errors';

/** R-SCH-06/07, R-STU-05: one transaction; a replay returns the first pick. */
@Injectable()
export class TrialDates {
  constructor(
    private readonly queries: TrialDateRepo,
    private readonly planner: BookingPlanner,
    private readonly deps: TrialDateDeps,
  ) {}

  async history(studentId: string): Promise<TrialHistory> {
    const student = await this.queries.student(studentId);
    if (!student) throw httpError(HttpStatus.NOT_FOUND, 'student_not_found');
    const lessons = trialLessonsOf(await this.queries.trialLessons(studentId));
    const creators = lessons.flatMap((l) => (l.created_by ? [l.created_by] : []));
    const names = await this.queries.names([...new Set(creators)]);
    const history = trialHistory({ student, lessons, names, now: new Date() });
    return asResponse(trialHistorySchema, history);
  }

  /** 400 trial_date_invalid, 404 student_not_found, 409 trial_date_subscribed; the trial to move */
  async target(req: BookingRequest): Promise<TrialTarget> {
    const studentId = trialStudentId(req);
    assertCanPick(await this.queries.student(studentId));
    const lessons = trialLessonsOf(await this.queries.trialLessons(studentId));
    const next = upcomingTrial(lessons, new Date());
    const old = next ? movedFrom(next, await this.queries.lessonStudents(next.id)) : null;
    return targetOf({ req, studentId, old, requestId: randomUUID() });
  }

  /** This request id's first pick for this student, if any (its idempotent re-check reruns). */
  async replay(req: BookingRequest, actorId: string): Promise<TrialDateResult | null> {
    const id = req.clientRequestId;
    const first = id ? await this.queries.replay(id, trialStudentId(req)) : null;
    if (!first) return null;
    const result = asBooking(first, { req, alerted: [] });
    await this.deps.after.afterReplay({ req, result, actorId });
    return first;
  }

  /** POST …/trial-date/check: the clashes, the moved trial left out. */
  check({ req, old }: TrialTarget): Promise<Conflict[]> {
    return this.planner.conflicts(req, { excludeLessonIds: old ? [old.id] : [] });
  }

  /**
   * 201 TrialDateResult; 409 conflict unless override.reason (the admin's), trial_date_subscribed,
   * trial_changed.
   */
  async pick(target: TrialTarget, actorId: string): Promise<TrialDateResult> {
    const { req, old } = target;
    const prepared = await this.planner.prepare(req, { excludeLessonIds: old ? [old.id] : [] });
    const confirmations = await gateConfirmations(this.deps.policy, prepared.payload.messages);
    const gated = { ...prepared.payload, messages: confirmations };
    const family = await this.family(gated, old);
    const payload = { ...gated, messages: family.messages };
    const lessonId = req.clientRequestId;
    const pick = old
      ? movePick({ payload, actorId, old, lessonId })
      : bookPick({ payload, actorId });
    if (!pick) throw new Error('trial date planned no lesson');
    let result: TrialDateResult;
    try {
      result = await this.queries.pick(pick);
    } catch (e) {
      // The same request twice at once: the loser (trial_changed, or the request id's unique key)
      // finds the winner's pick.
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
    // The move's own notice: the teacher and the family hear the new time.
    const change = old ? movedTrial({ old, result, actorId, familyNotice }) : null;
    if (change) await this.deps.events.scheduleChanged(change);
    // Always the new lesson's alert (dedup by its id): the old lesson's queued one goes stale, and
    // a same-teacher move has no moved-lesson notice, so this is how that teacher learns the new
    // time.
    const booking = asBooking(result, { req, alerted: [result] });
    await this.deps.after.afterBooking({ req, result: booking, actorId });
  }
}

interface FollowUp {
  req: BookingRequest;
  old: MovedTrial | null;
  result: TrialDateResult;
  actorId: string;
  /** FamilyMoveNotice's choice: the family hears the move by lesson_rescheduled. */
  familyNotice: boolean;
}

interface Alerted {
  req: BookingRequest;
  alerted: readonly TrialDateResult[];
}

/** The picked lesson as the BookingResult the booking follow-ups read (lessons: who is alerted). */
function asBooking(r: TrialDateResult, o: Alerted): BookingResult {
  const lessons = o.alerted.map((l) => ({
    id: l.lesson_id,
    starts_at: l.starts_at,
    ends_at: l.ends_at,
  }));
  const studentIds = 'studentIds' in o.req ? o.req.studentIds : [];
  const none = { guardian_ids: [], message_ids: [], invoice_id: null };
  return { rule_id: r.lesson_id, student_ids: studentIds, lessons, ...none };
}
