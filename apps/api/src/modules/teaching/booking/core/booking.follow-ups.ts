import { bookingKindOf } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { StudentTrialStatus } from '../../../finance/subscriptions/trial/student-trial-status';
import { TeacherAlert, type BookedEvent } from '../teacher/teacher-alert.service';

type BookingDone = BookedEvent & { actorId: string };

/**
 * What a saved booking (the admin's and the assistant's wizard) changes next: a trial booking moves its
 * students new → trial (StudentTrialStatus, owner 2026-10-15, docs/11 §7; sends nothing), then the
 * teacher hears about it (TeacherAlert, R-NOT-03). Neither throws: the booking is already saved.
 */
@Injectable()
export class BookingFollowUps {
  constructor(
    private readonly alert: TeacherAlert,
    private readonly trial: StudentTrialStatus,
  ) {}

  async afterBooking({ req, result, actorId }: BookingDone): Promise<void> {
    await this.afterReplay({ req, result, actorId });
    await this.alert.afterBooking({ req, result });
  }

  /**
   * A replayed booking (same clientRequestId): only the idempotent trial evaluation, so a first call
   * that failed after its commit still moves its students; never the teacher alert or push again.
   */
  async afterReplay({ req, result, actorId }: BookingDone): Promise<void> {
    if (bookingKindOf(req) === 'trial') await this.trial.evaluate(result.student_ids, actorId);
  }
}
