import { trialMove, type TrialFacts } from '@ab/shared';
import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { LessonEvents } from '../../../common/events/lesson-events';
import { NO_TRIAL, trialFactsOf } from './student-trial.plan';
import { StudentTrialQueries } from './student-trial.queries';
import { StudentStatusQueries } from '../student-lifecycle/student-status.queries';

const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

/**
 * Transitions 2–3 (owner 2026-10-15, docs/11 §7, R-STU-05): new → trial when a trial lesson is booked,
 * → pending_subscription once it is attended, trial → new when it is missed / cancelled with nothing
 * else booked (trialMove). Evaluated after a trial booking (BookingFollowUps) and on every lesson change
 * of a trial lesson (LessonEvents: attendance, cancel, move, a submitted report). Compare-and-set on the
 * status read, audited (via trial + from / to / reason): a status set by hand to anything else wins.
 * An attended trial of a student who already paid moves nothing (paid, read only when attended).
 * Sends nothing (no WhatsApp, push or email). Never throws: the booking or lesson change is committed.
 */
@Injectable()
export class StudentTrialStatus implements OnModuleInit {
  private readonly log = new Logger(StudentTrialStatus.name);

  constructor(
    private readonly statuses: StudentStatusQueries,
    private readonly queries: StudentTrialQueries,
    private readonly events: LessonEvents,
  ) {}

  onModuleInit(): void {
    this.events.onChanged(async (lessonIds) => void (await this.afterLessons(lessonIds)));
  }

  /** The students of the changed lessons whose rule is a trial; nothing for other lessons. */
  async afterLessons(lessonIds: readonly string[]): Promise<number> {
    try {
      return await this.evaluate(await this.queries.studentsOfTrialLessons(lessonIds), null);
    } catch (e) {
      this.log.error(`trial status after lessons failed: ${message(e)}`);
      return 0;
    }
  }

  /** How many students moved. Never throws (a failure is logged, the next event or edit catches up). */
  async evaluate(studentIds: readonly string[], actorId: string | null): Promise<number> {
    const ids = [...new Set(studentIds)];
    if (ids.length === 0) return 0;
    try {
      const facts = trialFactsOf(await this.queries.lessonsOf(ids));
      let moved = 0;
      for (const id of ids) if (await this.one(id, { facts: facts.get(id) ?? NO_TRIAL, actorId })) moved += 1;
      return moved;
    } catch (e) {
      this.log.error(`trial status failed: ${message(e)}`);
      return 0;
    }
  }

  private async one(studentId: string, o: { facts: TrialFacts; actorId: string | null }): Promise<boolean> {
    try {
      const student = await this.statuses.student(studentId);
      if (!student) return false;
      const paid = o.facts.attended && (await this.statuses.hasPositivePayment(studentId));
      const plan = trialMove(student.status, { ...o.facts, paid });
      if (!plan) return false;
      const after = { via: 'trial', from: plan.from, to: plan.to, reason: plan.reason };
      return await this.statuses.move({ studentId, from: plan.from, to: plan.to }, { actorId: o.actorId, after });
    } catch (e) {
      this.log.error(`trial status of student ${studentId} failed: ${message(e)}`);
      return false;
    }
  }
}
