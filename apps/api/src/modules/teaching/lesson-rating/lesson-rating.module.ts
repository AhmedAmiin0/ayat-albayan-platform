import { Module } from '@nestjs/common';
import { InboxModule } from '@/modules/messaging/inbox/inbox.module';
import { LessonRatingSettings } from './lesson-rating.settings';
import { RatingController } from './rating.controller';
import { RatingJob } from './queue/rating.job';
import { RatingRepo } from './rating.repo';
import { RatingQueue } from './queue/rating.queue';
import { RatingReads } from './rating.reads';
import { RatingSendService } from './rating.send.service';
import { RatingStore } from './rating.store';

/** Lesson rating by WhatsApp buttons (migration 195, docs/12 §2.1); LessonEvents is global. */
@Module({
  imports: [InboxModule],
  controllers: [RatingController],
  providers: [RatingRepo, LessonRatingSettings, RatingReads, RatingQueue, RatingJob, RatingStore, RatingSendService],
  exports: [RatingStore],
})
export class LessonRatingModule {}
