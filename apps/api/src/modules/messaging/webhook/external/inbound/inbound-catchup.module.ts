import { Module } from '@nestjs/common';
import { WebhookExternalModule } from '@/modules/messaging/webhook/external';
import { WebhookInboundModule } from '@/modules/messaging/webhook/inbound';
import { InboundCatchUpJob } from './inbound-catchup.job';
import { InboundCatchUpRepo } from './inbound-catchup.repo';
import { InboundCatchUp } from './inbound-catchup.service';
import { InboundGapAlert } from './inbound-gap.alert';
import { InboundListing } from './inbound-listing';

/** Families' messages the webhook missed, read back from Kapso's inbound history. */
@Module({
  imports: [WebhookExternalModule, WebhookInboundModule],
  providers: [
    InboundCatchUpRepo,
    InboundListing,
    InboundCatchUp,
    InboundGapAlert,
    InboundCatchUpJob,
  ],
})
export class InboundCatchUpModule {}
