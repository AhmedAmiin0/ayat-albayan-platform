import { Injectable } from '@nestjs/common';
import { LessonEvents } from '@/common/infra/events/lesson-events';
import { NotificationPolicy } from '@/modules/messaging/notification-rules';
import { BookingFollowUps } from '@/modules/teaching/booking/core/booking.follow-ups';
import { FamilyMoveNotice } from '@/modules/teaching/schedule-notices';

/** What a picked date sets in motion after its commit (one injectable: constructors stay ≤ 3). */
@Injectable()
export class TrialDateDeps {
  constructor(
    readonly policy: NotificationPolicy,
    readonly after: BookingFollowUps,
    readonly events: LessonEvents,
    readonly move: FamilyMoveNotice,
  ) {}
}
