import { Injectable } from '@nestjs/common';
import { AuditService } from '../../../../common/audit/audit.service';
import { LinkViews } from './link-views';
import { PaymentLinksQueries } from './payment-links.queries';

/** What every payment-link service needs (rule 2: at most 3 constructor parameters). */
@Injectable()
export class LinkDeps {
  constructor(
    readonly links: PaymentLinksQueries,
    readonly audit: AuditService,
    readonly views: LinkViews,
  ) {}
}
