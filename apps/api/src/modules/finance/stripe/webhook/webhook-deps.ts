import { Injectable } from '@nestjs/common';
import { PackageEvents } from '@/common/infra/events/lesson-events';
import { PaymentsService } from '@/modules/finance/payments';
import { PaymentLinksRepo } from '@/modules/finance/stripe/links/payment-links.repo';
import { LinkAlerts } from './link-alerts';

/** What the webhook's handlers share (rule 2: at most 4 constructor parameters). */
@Injectable()
export class WebhookDeps {
  constructor(
    readonly links: PaymentLinksRepo,
    readonly payments: PaymentsService,
    readonly alerts: LinkAlerts,
    readonly packages: PackageEvents,
  ) {}
}
