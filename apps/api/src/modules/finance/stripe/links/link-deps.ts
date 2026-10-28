import { Injectable } from '@nestjs/common';
import { AuditService } from '../../../../common/audit/audit.service';
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

/** LinkCreate's own: the cap and the release of earlier unused link packages. */
@Injectable()
export class LinkCreateDeps {
  constructor(
    readonly settings: StripeSettingsQueries,
    readonly packages: LinkPackages,
  ) {}
}
