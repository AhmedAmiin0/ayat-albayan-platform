import { Module } from '@nestjs/common';
import { loadEnv } from '../../../config/env/env';
import { CallsModule } from '../calls/calls.module';
import { LeadsModule } from '../../sales/leads/leads.module';
import { LessonRatingModule } from '../../teaching/lesson-rating/lesson-rating.module';
import { LessonsModule } from '../../teaching/lessons/lessons.module';
import { liveWebhookConfig } from './webhook.config';
import { WebhookController } from './webhook.controller';
import { KapsoWebhookController } from './providers/webhook.kapso.controller';
import { WacrmWebhookController } from './providers/webhook.wacrm.controller';
import { InboundService } from './inbound/webhook.inbound.service';
import { InboundStore } from './inbound/webhook.inbound.store';
import { WebhookQueries } from './webhook.queries';
import { QuickReplies } from './inbound/webhook.quick-reply';
import { WEBHOOK_CONFIG, WebhookService, type WebhookConfig } from './webhook.service';
import { WebhookSettings } from './webhook.settings';
import { StatusService } from './status/webhook.status.service';

/**
 * GET/POST /webhooks/whatsapp (docs/12 §3.5, routes W1–W2), POST /webhooks/kapso and /webhooks/wacrm (docs/19). Inbound processing does not depend on
 * the send gate. PushService and AuditService are global.
 */
@Module({
  imports: [LeadsModule, LessonsModule, LessonRatingModule, CallsModule],
  controllers: [WebhookController, KapsoWebhookController, WacrmWebhookController],
  providers: [
    {
      provide: WEBHOOK_CONFIG,
      useFactory: (): WebhookConfig => liveWebhookConfig(() => loadEnv()),
    },
    WebhookService,
    InboundService,
    InboundStore,
    StatusService,
    QuickReplies,
    WebhookSettings,
    WebhookQueries,
  ],
})
export class WebhookModule {}
