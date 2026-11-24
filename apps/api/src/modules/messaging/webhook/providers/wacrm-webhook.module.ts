import { Module } from '@nestjs/common';
import { CrmInboundModule } from '@/modules/messaging/webhook/crm-inbound';
import { WebhookSharedModule } from '@/modules/messaging/webhook/shared';
import { WebhookStatusModule } from '@/modules/messaging/webhook/status';
import { WacrmWebhookController } from './webhook.wacrm.controller';

/** POST /webhooks/wacrm (docs/19 «crm driver»): the CRM's ticks and mirrored inbound messages. */
@Module({
  imports: [WebhookSharedModule, WebhookStatusModule, CrmInboundModule],
  controllers: [WacrmWebhookController],
})
export class WacrmWebhookModule {}
