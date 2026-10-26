import { Injectable } from '@nestjs/common';
import { AuditService } from '../../../../common/audit/audit.service';
import { RulesParity } from '../../notification-rules/sync/rules.parity';

/**
 * CommunicationsService's collaborators beyond the numbers config (kept to ≤ 3 constructor params):
 * the audit trail and the notification rules' parity (RulesParity, exported by the global
 * NotificationRulesModule, so the numbers module needs no import of it).
 */
@Injectable()
export class CommunicationsDeps {
  constructor(
    readonly audit: AuditService,
    readonly rules: RulesParity,
  ) {}
}
