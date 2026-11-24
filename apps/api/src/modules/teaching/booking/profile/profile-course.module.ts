import { Module } from '@nestjs/common';
import { BookingSharedModule } from '@/modules/teaching/booking/booking-shared.module';
import { CourseChangeModule } from '@/modules/teaching/booking/course-change.module';
import { CourseTeacherController, CourseTimesController } from './profile-course.controller';
import { ProfileCourseRepo } from './profile-course.repo';
import { ProfileCourse } from './profile-course.service';

/** The course card and extend features read the profile course through its repo. */
@Module({
  imports: [BookingSharedModule, CourseChangeModule],
  controllers: [CourseTeacherController, CourseTimesController],
  providers: [ProfileCourse, ProfileCourseRepo],
  exports: [ProfileCourseRepo],
})
export class ProfileCourseModule {}
