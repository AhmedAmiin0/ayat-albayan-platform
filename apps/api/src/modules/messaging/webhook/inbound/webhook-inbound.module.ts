import { Module } from '@nestjs/common';
import { LeadsModule } from '@/modules/sales/leads';
import { LessonRatingModule } from '@/modules/teaching/lesson-rating';
import { LessonsModule } from '@/modules/teaching/lessons';
import { WebhookSharedModule } from '@/modules/messaging/webhook/shared';
import { InboundService } from './webhook.inbound.service';
import { InboundStore } from './webhook.inbound.store';
import { QuickReplies } from './webhook.quick-reply';
import { InboundReactions } from './webhook.reaction';

/**
 * A family's message, button reply or reaction stored in the inbox. InboundService reaches
 * InboundReactions optionally, so both stay in this module.
 */
@Module({
  imports: [WebhookSharedModule, LeadsModule, LessonsModule, LessonRatingModule],
  providers: [InboundService, InboundStore, InboundReactions, QuickReplies],
  exports: [InboundService],
})
export class WebhookInboundModule {}
