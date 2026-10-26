import { Injectable } from '@nestjs/common';
import { AuditService } from '../../../../common/audit/audit.service';
import { InboundCalls } from './inbound.service';
import { OutboundCalls } from './outbound.service';

/** The call actions the controller runs, and the audit log they are written to. */
@Injectable()
export class CallFlows {
  constructor(
    readonly outbound: OutboundCalls,
    readonly inbound: InboundCalls,
    readonly audit: AuditService,
  ) {}
}
