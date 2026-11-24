import { Module } from '@nestjs/common';
import { CallsModule } from '@/modules/messaging/calls';
import { CrmConfirmModule } from '@/modules/messaging/webhook/crm-confirm';
import { CrmInboundModule } from '@/modules/messaging/webhook/crm-inbound';
import { CrmWebhookModule } from '@/modules/messaging/webhook/crm-register';
import { EvolutionWebhookModule } from '@/modules/messaging/webhook/evolution';
import { WebhookExternalModule } from '@/modules/messaging/webhook/external';
import { InboundCatchUpModule } from '@/modules/messaging/webhook/external/inbound';
import { ManualEchoModule } from '@/modules/messaging/webhook/external/manual-echo';
import { WebhookInboundModule } from '@/modules/messaging/webhook/inbound';
import { WebhookLinesModule } from '@/modules/messaging/webhook/lines';
import { WacrmWebhookModule } from '@/modules/messaging/webhook/providers';
import { WebhookSharedModule } from '@/modules/messaging/webhook/shared';
import { WebhookStatusModule } from '@/modules/messaging/webhook/status';
import { WebhookController } from './webhook.controller';
import { KapsoWebhookController } from './webhook.kapso.controller';
import { WebhookService } from './webhook.service';

/**
 * GET/POST /webhooks/whatsapp (docs/12 §3.5, routes W1–W2) and POST /webhooks/kapso through
 * WebhookService; /webhooks/wacrm, /webhooks/evolution and the CRM receiver in their folders
 * (docs/19). Inbound processing does not depend on the send gate. PushService and AuditService are
 * global. CallsModule (CALL_EVENTS) and WebhookLinesModule are imported for WebhookService's
 * optional injections, which would otherwise resolve to nothing without an error.
 * The one place the webhook modules are wired: AppModule imports this.
 */
@Module({
  imports: [
    ...[WebhookSharedModule, WebhookInboundModule, WebhookStatusModule, WebhookLinesModule],
    ...[CrmConfirmModule, ManualEchoModule, WebhookExternalModule, InboundCatchUpModule],
    ...[CrmInboundModule, WacrmWebhookModule, EvolutionWebhookModule, CrmWebhookModule],
    CallsModule,
  ],
  controllers: [WebhookController, KapsoWebhookController],
  providers: [WebhookService],
})
export class WebhookModule {}
