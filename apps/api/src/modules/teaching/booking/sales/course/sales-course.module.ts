import { Module } from '@nestjs/common';
import { SubscriptionsModule } from '@/modules/finance/subscriptions';
import { BookingSharedModule } from '@/modules/teaching/booking/booking-shared.module';
import { CourseChangeModule } from '@/modules/teaching/booking/course-change.module';
import { CourseDraftEnv } from '@/modules/teaching/booking/sales/course-draft/course-draft.env';
import { CourseDrafts } from '@/modules/teaching/booking/sales/course-draft/course-draft.service';
import { SalesCourseController } from './sales-course.controller';

/** Course drafts have no routes of their own: only this controller saves them. */
@Module({
  imports: [BookingSharedModule, CourseChangeModule, SubscriptionsModule],
  controllers: [SalesCourseController],
  providers: [CourseDraftEnv, CourseDrafts],
})
export class SalesCourseModule {}
