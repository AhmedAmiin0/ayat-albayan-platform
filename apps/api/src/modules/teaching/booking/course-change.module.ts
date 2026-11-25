import { Module } from '@nestjs/common';
import { ScheduleNoticesModule } from '@/modules/teaching/schedule-notices';
import { SchedulingModule } from '@/modules/teaching/scheduling';
import { BookingSharedModule } from './booking-shared.module';
import { CourseChangeController } from './course-change/course-change.controller';
import { CourseLessonRepo } from './course-change/course-change.lessons';
import { CourseChangePlanner } from './course-change/course-change.planner';
import { CourseChangeRepo } from './course-change/course-change.repo';
import { CourseChange } from './course-change/course-change.service';
import { CourseChangeViews } from './course-change/course-change.view';
import { CourseChangeDeps, CourseChangeWriter } from './course-change/course-change.writer';
import { CourseChangeNotices } from './course-change/notices/course-change.notices';

/**
 * Sits beside its folder, which is full. The sales course, profile, card and extend features read
 * and change a course through it, so its service, views and repos are exported.
 */
@Module({
  imports: [BookingSharedModule, SchedulingModule, ScheduleNoticesModule],
  controllers: [CourseChangeController],
  providers: [
    ...[CourseChange, CourseChangeRepo, CourseLessonRepo, CourseChangePlanner, CourseChangeViews],
    ...[CourseChangeDeps, CourseChangeWriter, CourseChangeNotices],
  ],
  exports: [CourseChange, CourseChangeViews, CourseChangeRepo, CourseLessonRepo],
})
export class CourseChangeModule {}
