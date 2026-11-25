import { Module } from '@nestjs/common';
import { BookingSharedModule } from '@/modules/teaching/booking/booking-shared.module';
import { CourseChangeModule } from '@/modules/teaching/booking/course-change.module';
import { ProfileCourseModule } from '@/modules/teaching/booking/profile';
import { SchedulingModule } from '@/modules/teaching/scheduling';
import { CourseExtendController } from './course-extend.controller';
import { CourseExtendReader } from './course-extend.reader';
import { CourseExtendRepo } from './course-extend.repo';
import { CourseExtend } from './course-extend.service';

@Module({
  imports: [BookingSharedModule, ProfileCourseModule, CourseChangeModule, SchedulingModule],
  controllers: [CourseExtendController],
  providers: [CourseExtend, CourseExtendReader, CourseExtendRepo],
})
export class CourseExtendModule {}
