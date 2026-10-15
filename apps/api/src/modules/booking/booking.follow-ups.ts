import { bookingKindOf } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { StudentTrialStatus } from '../subscriptions/student-trial-status';
import { TeacherAlert, type BookedEvent } from './teacher-alert.service';

export type BookingDone = BookedEvent & { actorId: string };

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
    if (bookingKindOf(req) === 'trial') await this.trial.evaluate(result.student_ids, actorId);
    await this.alert.afterBooking({ req, result });
  }
}
