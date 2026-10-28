import { Injectable } from '@nestjs/common';
import { PaymentsService } from '../../payments';
import { PaymentLinksQueries } from '../links/payment-links.queries';
import { LinkAlerts } from './link-alerts';

/** What the webhook's handlers share (rule 2: at most 3 constructor parameters). */
@Injectable()
export class WebhookDeps {
  constructor(
    readonly links: PaymentLinksQueries,
    readonly payments: PaymentsService,
    readonly alerts: LinkAlerts,
  ) {}
}
