import { Injectable } from '@nestjs/common';
import { NotificationPolicy } from '../notification-rules/policy';
import { FollowUpsSettings } from './follow-ups.settings';

/** What FollowUpsJob reads besides its queries: the automatic-messages switch and the follow_up_slots rule (max-params). */
@Injectable()
export class FollowUpsReads {
  constructor(
    readonly settings: FollowUpsSettings,
    readonly policy: NotificationPolicy,
  ) {}
}
