import { Module } from '@nestjs/common';
import { CrmWebhookController } from './crm-webhook.controller';
import {
  CRM_WEBHOOK_SOURCE,
  CrmWebhookRegistrar,
  liveCrmWebhookSource,
} from './crm-webhook.service';

/** Registers this API's receiver with the CRM (docs/19 «crm driver»). */
@Module({
  controllers: [CrmWebhookController],
  providers: [
    { provide: CRM_WEBHOOK_SOURCE, useFactory: liveCrmWebhookSource },
    CrmWebhookRegistrar,
  ],
})
export class CrmWebhookModule {}
