import { Module } from '@nestjs/common';
import { loadEnv } from '@/config/env/env';
import { InboxModule } from '@/modules/messaging/inbox/inbox.module';
import { TeachersModule } from '@/modules/people/teachers/teachers.module';
import { FEEDBACK_CONFIG, type FeedbackConfig } from './feedback.config';
import { FeedbackController } from './feedback.controller';
import { FeedbackPublicController } from './public/feedback.public.controller';
import { FeedbackPublicService } from './public/feedback.public.service';
import { FeedbackRepo } from './feedback.repo';
import { PublicFeedbackLimit } from './public/feedback.rate-limit';
import { FeedbackReadRepo } from './read/feedback.read.repo';
import { FeedbackReadService } from './read/feedback.read.service';
import { FeedbackRequestService } from './request/feedback.request.service';
import { FeedbackSender } from './request/feedback.sender';
import { FeedbackSettings } from './feedback.settings';
import { FeedbackLinksModule } from './links/feedback-links.module';

/** Lesson feedback (docs/13 form 3): admin request, the family's public page, the lists. */
@Module({
  // FeedbackLinksModule is global: it provides FamilyFeedbackLinks to the report PDF module.
  imports: [InboxModule, TeachersModule, FeedbackLinksModule],
  controllers: [FeedbackController, FeedbackPublicController],
  providers: [
    { provide: FEEDBACK_CONFIG, useFactory: (): FeedbackConfig => ({ secret: loadEnv().FEEDBACK_TOKEN_SECRET ?? null }) },
    FeedbackSettings,
    { provide: PublicFeedbackLimit, useFactory: (s: FeedbackSettings) => new PublicFeedbackLimit(s), inject: [FeedbackSettings] },
    FeedbackRepo,
    FeedbackReadRepo,
    FeedbackSender,
    FeedbackRequestService,
    FeedbackPublicService,
    FeedbackReadService,
  ],
})
export class FeedbackModule {}
