import { Injectable } from '@nestjs/common';
import { NotificationPolicy } from '../../messaging/notification-rules/policy/policy';
import { LessonRatingSettings } from './lesson-rating.settings';

/** What RatingQueue reads: the automatic-messages switch and the lesson_rating rule (one injectable: max-params). */
@Injectable()
export class RatingReads {
  constructor(
    readonly settings: LessonRatingSettings,
    readonly policy: NotificationPolicy,
  ) {}
}
