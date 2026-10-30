import { Module } from '@nestjs/common';
import { SubscriptionsModule } from '@/modules/finance/subscriptions';
import { LessonsModule } from '@/modules/teaching/lessons';
import { CourseStopController } from './course-stop.controller';
import { CourseStopRepo } from './course-stop.repo';
import { CourseStop } from './course-stop.service';
import { StopStudentRepo } from './stop-student.repo';

/**
 * «إلغاء الاشتراك» from the student's profile (owner 2026-10-30): stop the course, keep the money.
 */
@Module({
  imports: [LessonsModule, SubscriptionsModule],
  controllers: [CourseStopController],
  providers: [CourseStop, CourseStopRepo, StopStudentRepo],
})
export class CourseStopModule {}
