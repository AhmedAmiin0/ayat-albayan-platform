import { Injectable } from '@nestjs/common';
import { PushService } from '../../../common/push/push.service';
import { NotificationPolicy } from '../notification-rules/policy/policy';

/** What RemindersJob asks and tells besides its queries and settings (one injectable: max-params). */
@Injectable()
export class RemindersDeps {
  constructor(
    readonly push: PushService,
    readonly policy: NotificationPolicy,
  ) {}
}
