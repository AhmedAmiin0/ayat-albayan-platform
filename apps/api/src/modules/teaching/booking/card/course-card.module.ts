import { Module } from '@nestjs/common';
import { SubscriptionsModule } from '@/modules/finance/subscriptions';
import { CourseChangeModule } from '@/modules/teaching/booking/course-change.module';
import { ProfileCourseModule } from '@/modules/teaching/booking/profile';
import { CourseCardController, SalesCourseCardController } from './course-card.controller';
import { CourseCardCourse } from './course-card.course';
import { CourseCards } from './course-card.service';

@Module({
  imports: [ProfileCourseModule, CourseChangeModule, SubscriptionsModule],
  controllers: [CourseCardController, SalesCourseCardController],
  providers: [CourseCards, CourseCardCourse],
})
export class CourseCardModule {}
