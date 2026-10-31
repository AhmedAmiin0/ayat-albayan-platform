import { Module } from '@nestjs/common';
import { SubscriptionsModule } from '@/modules/finance/subscriptions';
import { CourseStopController } from './course-stop.controller';
import { CourseStopRepo } from './course-stop.repo';
import { CourseStop } from './course-stop.service';

/**
 * «إلغاء الاشتراك» from the student's profile (owner 2026-10-30): stop the course, keep the money.
 */
@Module({
  imports: [SubscriptionsModule],
  controllers: [CourseStopController],
  providers: [CourseStop, CourseStopRepo],
})
export class CourseStopModule {}
