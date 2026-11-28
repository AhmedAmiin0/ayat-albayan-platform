import { Injectable } from '@nestjs/common';
import { CommissionBell } from './commission-bell';
import { StudentDeactivation } from '@/modules/finance/subscriptions/student-lifecycle/student-deactivation';

/** The deleted payment's revert and the commission bell (max-params). */
@Injectable()
export class FollowUpEnv {
  constructor(
    readonly revert: StudentDeactivation,
    readonly commissions: CommissionBell,
  ) {}
}
