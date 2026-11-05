import { Global, Module } from '@nestjs/common';
import { FamilyFeedbackLinks } from '@/common/http/family-feedback';
import { loadEnv } from '@/config/env/env';
import { FEEDBACK_CONFIG, type FeedbackConfig } from '@/modules/teaching/feedback/feedback.config';
import { FeedbackRepo } from '@/modules/teaching/feedback/feedback.repo';
import { FeedbackLinks } from './feedback.links';

/**
 * FamilyFeedbackLinks for every module (global; the report's WhatsApp message), without the inbox.
 */
@Global()
@Module({
  providers: [
    {
      provide: FEEDBACK_CONFIG,
      useFactory: (): FeedbackConfig => ({ secret: loadEnv().FEEDBACK_TOKEN_SECRET ?? null }),
    },
    FeedbackRepo,
    FeedbackLinks,
    { provide: FamilyFeedbackLinks, useExisting: FeedbackLinks },
  ],
  exports: [FamilyFeedbackLinks],
})
export class FeedbackLinksModule {}
