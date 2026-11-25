import { Module } from '@nestjs/common';
import { NumbersModule } from '@/modules/messaging/numbers';
import { WebhookInboundModule } from '@/modules/messaging/webhook/inbound';
import { WebhookSharedModule } from '@/modules/messaging/webhook/shared';
import { WebhookStatusModule } from '@/modules/messaging/webhook/status';
import { EvolutionRestriction } from './evolution-restriction';
import { EvolutionStateRepo } from './evolution-state.repo';
import { EvolutionWebhookController } from './evolution-webhook.controller';
import { EvolutionWebhookService } from './evolution-webhook.service';

/** Evolution API numbers (docs/19 «Evolution driver»): inbound, ticks, connection state. */
@Module({
  imports: [WebhookSharedModule, WebhookInboundModule, WebhookStatusModule, NumbersModule],
  controllers: [EvolutionWebhookController],
  providers: [EvolutionWebhookService, EvolutionStateRepo, EvolutionRestriction],
})
export class EvolutionWebhookModule {}
