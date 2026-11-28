import { Injectable } from '@nestjs/common';
import { AuditService } from '@/common/audit/audit.service';
import { CommissionBell } from '@/modules/finance/subscriptions';

/** The audit and the commission bell (max-params). */
@Injectable()
export class TermsEnv {
  constructor(
    readonly audit: AuditService,
    readonly bell: CommissionBell,
  ) {}
}
