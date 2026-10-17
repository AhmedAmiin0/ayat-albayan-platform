import { Module } from '@nestjs/common';
import { loadEnv } from '../../env';
import { LeadsModule } from '../leads/leads.module';
import { LessonRatingModule } from '../lesson-rating/lesson-rating.module';
import { LessonsModule } from '../lessons/lessons.module';
import { liveWebhookConfig } from './webhook.config';
import { WebhookController } from './webhook.controller';
import { KapsoWebhookController } from './webhook.kapso.controller';
import { InboundService } from './webhook.inbound.service';
import { InboundStore } from './webhook.inbound.store';
import { WebhookQueries } from './webhook.queries';
import { QuickReplies } from './webhook.quick-reply';
import { WEBHOOK_CONFIG, WebhookService, type WebhookConfig } from './webhook.service';
import { StatusService } from './webhook.status.service';

/**
 * GET/POST /webhooks/whatsapp (docs/12 §3.5, routes W1–W2) and POST /webhooks/kapso (docs/19). Inbound processing does not depend on
 * the send gate. PushService and AuditService are global.
 */
@Module({
  imports: [LeadsModule, LessonsModule, LessonRatingModule],
  controllers: [WebhookController, KapsoWebhookController],
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
    WebhookQueries,
  ],
})
export class WebhookModule {}
