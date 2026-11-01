import { Module } from '@nestjs/common';
import { loadEnv } from '@/config/env/env';
import { CallsModule } from '@/modules/messaging/calls/calls.module';
import { LeadsModule } from '@/modules/sales/leads/leads.module';
import { LessonRatingModule } from '@/modules/teaching/lesson-rating/lesson-rating.module';
import { LessonsModule } from '@/modules/teaching/lessons/lessons.module';
import { liveWebhookConfig } from './webhook.config';
import { WebhookConfigReload } from './lines/webhook.reload';
import { WebhookController } from './webhook.controller';
import { KapsoWebhookController } from './providers/webhook.kapso.controller';
import { WacrmWebhookController } from './providers/webhook.wacrm.controller';
import { InboundService } from './inbound/webhook.inbound.service';
import { InboundStore } from './inbound/webhook.inbound.store';
import { InboundReactions } from './inbound/webhook.reaction';
import { WebhookRepo } from './webhook.repo';
import { QuickReplies } from './inbound/webhook.quick-reply';
import { WEBHOOK_CONFIG, WebhookService, type WebhookConfig } from './webhook.service';
import { WebhookSettings } from './webhook.settings';
import { StatusService } from './status/webhook.status.service';
import { ExternalCatchUpJob } from './external/external-catchup.job';
import { ExternalStatus, KAPSO_HISTORY } from './external/external-status';
import { ExternalRepo } from './external/external.repo';
import { ExternalStore } from './external/external.store';
import { KapsoHistory } from './external/kapso-history';
import { InboundCatchUpJob } from '@/modules/messaging/webhook/external/inbound/inbound-catchup.job';
import { InboundCatchUpRepo } from '@/modules/messaging/webhook/external/inbound/inbound-catchup.repo';
import { InboundCatchUp } from '@/modules/messaging/webhook/external/inbound/inbound-catchup.service';
import { InboundGapAlert } from '@/modules/messaging/webhook/external/inbound/inbound-gap.alert';
import { InboundListing } from '@/modules/messaging/webhook/external/inbound/inbound-listing';

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
    WebhookConfigReload,
    InboundService,
    InboundStore,
    InboundReactions,
    StatusService,
    QuickReplies,
    WebhookSettings,
    WebhookRepo,
    // Messages staff send outside the app (Kapso's inbox, WhatsApp Business app echoes).
    { provide: KAPSO_HISTORY, useFactory: () => new KapsoHistory() },
    ExternalRepo,
    ExternalStore,
    ExternalStatus,
    ExternalCatchUpJob,
    // Families' messages the webhook missed (Kapso's inbound history, incident 2026-10-30).
    InboundCatchUpRepo,
    InboundListing,
    InboundCatchUp,
    InboundGapAlert,
    InboundCatchUpJob,
  ],
})
export class WebhookModule {}
