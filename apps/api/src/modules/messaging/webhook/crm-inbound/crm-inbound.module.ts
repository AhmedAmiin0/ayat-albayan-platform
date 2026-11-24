import { Module } from '@nestjs/common';
import { WebhookInboundModule } from '@/modules/messaging/webhook/inbound';
import { CrmInboundJob } from './crm-inbound.job';
import { liveCrmInboundSource } from './crm-inbound.place';
import { CrmInboundRepo } from './crm-inbound.repo';
import { CRM_INBOUND_SOURCE, CrmInbound } from './crm-inbound.service';

/** A message to the notifications number, mirrored from the CRM into the inbox. */
@Module({
  imports: [WebhookInboundModule],
  providers: [
    { provide: CRM_INBOUND_SOURCE, useFactory: liveCrmInboundSource },
    CrmInboundRepo,
    CrmInbound,
    CrmInboundJob,
  ],
  exports: [CrmInbound, CrmInboundJob],
})
export class CrmInboundModule {}
