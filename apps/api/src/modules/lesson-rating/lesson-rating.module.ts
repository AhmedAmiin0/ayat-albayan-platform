import { Module } from '@nestjs/common';
import { InboxModule } from '../inbox/inbox.module';
import { LessonRatingSettings } from './lesson-rating.settings';
import { RatingController } from './rating.controller';
import { RatingJob } from './rating.job';
import { RatingQueries } from './rating.queries';
import { RatingQueue } from './rating.queue';
import { RatingSendService } from './rating.send.service';
import { RatingStore } from './rating.store';

/**
 * «تقييم الحلقة» by WhatsApp buttons (migration 195, docs/12 §2.1): the automatic lesson_rating after
 * a lesson took place (RatingJob), the admin's «إرسال تقييم الحلقة» (POST /threads/:phone/rating),
 * and RatingStore for the webhook's button taps. The sender, registry and views come from the global
 * WhatsappModule; LessonEvents is global, so the lessons module never imports this one.
 */
@Module({
  imports: [InboxModule],
  controllers: [RatingController],
  providers: [RatingQueries, LessonRatingSettings, RatingQueue, RatingJob, RatingStore, RatingSendService],
  exports: [RatingStore],
})
export class LessonRatingModule {}
