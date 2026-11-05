import { Module } from '@nestjs/common';
import { loadEnv } from '@/config/env/env';
import { FEEDBACK_CONFIG, type FeedbackConfig } from '@/modules/teaching/feedback/feedback.config';
import { FeedbackRepo } from '@/modules/teaching/feedback/feedback.repo';
import { FeedbackLinks } from './feedback.links';

/**
 * The family's feedback link for other modules (the report's WhatsApp message), without the inbox.
 */
@Module({
  providers: [
    {
      provide: FEEDBACK_CONFIG,
      useFactory: (): FeedbackConfig => ({ secret: loadEnv().FEEDBACK_TOKEN_SECRET ?? null }),
    },
    FeedbackRepo,
    FeedbackLinks,
  ],
  exports: [FeedbackLinks],
})
export class FeedbackLinksModule {}
