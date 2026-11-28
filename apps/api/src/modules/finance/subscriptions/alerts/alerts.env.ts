import { Injectable } from '@nestjs/common';
import { PushService } from '@/common/push/push.service';
import { StudentRenewal } from '@/modules/finance/subscriptions/student-lifecycle/student-renewal';
import { SubscriptionsSettings } from '@/modules/finance/subscriptions/shared/subscriptions.settings';

@Injectable()
export class AlertsEnv {
  constructor(
    readonly settings: SubscriptionsSettings,
    readonly push: PushService,
    readonly renewal: StudentRenewal,
  ) {}
}
