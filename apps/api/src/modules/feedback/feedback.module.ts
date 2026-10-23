import { Module } from '@nestjs/common';
import { loadEnv } from '../../env';
import { InboxModule } from '../inbox/inbox.module';
import { TeachersModule } from '../teachers/teachers.module';
import { FEEDBACK_CONFIG, type FeedbackConfig } from './feedback.config';
import { FeedbackController } from './feedback.controller';
import { FeedbackPublicController } from './feedback.public.controller';
import { FeedbackPublicService } from './feedback.public.service';
import { FeedbackQueries } from './feedback.queries';
import { PublicFeedbackLimit } from './feedback.rate-limit';
import { FeedbackReadQueries } from './feedback.read.queries';
import { FeedbackReadService } from './feedback.read.service';
import { FeedbackRequestService } from './feedback.request.service';
import { FeedbackSender } from './feedback.sender';
import { FeedbackSettings } from './feedback.settings';

/**
 * «رأيك يهمّنا» (docs/13-forms-spec.md form 3): the admin's «ابعت طلب الرأي» (an approved WhatsApp
 * template with a signed link, through the inbox Outbox), the family's public page, and the admin
 * and teacher lists. TemplateRegistry comes from the global WhatsappModule.
 */
@Module({
  imports: [InboxModule, TeachersModule],
  controllers: [FeedbackController, FeedbackPublicController],
  providers: [
    { provide: FEEDBACK_CONFIG, useFactory: (): FeedbackConfig => ({ secret: loadEnv().FEEDBACK_TOKEN_SECRET ?? null }) },
    FeedbackSettings,
    { provide: PublicFeedbackLimit, useFactory: (s: FeedbackSettings) => new PublicFeedbackLimit(s), inject: [FeedbackSettings] },
    FeedbackQueries,
    FeedbackReadQueries,
    FeedbackSender,
    FeedbackRequestService,
    FeedbackPublicService,
    FeedbackReadService,
  ],
})
export class FeedbackModule {}
