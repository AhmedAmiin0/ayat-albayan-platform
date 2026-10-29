import { Injectable } from '@nestjs/common';
import { AuditService } from '../../../../common/audit/audit.service';
import { SalesTeacherAssign } from '../../../sales/sales-money';
import { StripeSettingsQueries } from '../gate/stripe-settings.queries';
import { LinkPackages } from './link-packages';
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

/** LinkCreate's own: the cap, the release of earlier unused link packages and «المعلم/ة» of the subscribe step. */
@Injectable()
export class LinkCreateDeps {
  constructor(
    readonly settings: StripeSettingsQueries,
    readonly packages: LinkPackages,
    readonly teachers: SalesTeacherAssign,
  ) {}
}
