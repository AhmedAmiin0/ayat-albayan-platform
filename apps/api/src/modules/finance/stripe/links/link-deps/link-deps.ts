import { Injectable } from '@nestjs/common';
import { AuditService } from '@/common/audit/audit.service';
import { LinkViews } from '@/modules/finance/stripe/links/link-views';
import { PaymentLinksRepo } from '@/modules/finance/stripe/links/payment-links.repo';

/** What every payment-link service needs (rule 2: at most 3 constructor parameters). */
@Injectable()
export class LinkDeps {
  constructor(
    readonly links: PaymentLinksRepo,
    readonly audit: AuditService,
    readonly views: LinkViews,
  ) {}
}
