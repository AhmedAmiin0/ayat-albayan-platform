import { Module } from '@nestjs/common';
import { CrmConfirmModule } from '@/modules/messaging/webhook/crm-confirm';
import { WebhookExternalModule } from '@/modules/messaging/webhook/external';
import { WebhookSharedModule } from '@/modules/messaging/webhook/shared';
import { StatusService } from './webhook.status.service';

/** Delivery ticks of our sends, of messages sent outside the app and of crm sends. */
@Module({
  imports: [WebhookSharedModule, WebhookExternalModule, CrmConfirmModule],
  providers: [StatusService],
  exports: [StatusService],
})
export class WebhookStatusModule {}
