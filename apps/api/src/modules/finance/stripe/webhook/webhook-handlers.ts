import { Injectable } from '@nestjs/common';
import { LinkAlerts } from './link-alerts';
import { LinkFulfilment } from './link-fulfilment';
import { LinkRefunds } from './link-refunds';

/** The event handlers (rule 2: at most 3 constructor parameters). */
@Injectable()
export class WebhookHandlers {
  constructor(
    readonly fulfil: LinkFulfilment,
    readonly refunds: LinkRefunds,
    readonly alerts: LinkAlerts,
  ) {}
}
