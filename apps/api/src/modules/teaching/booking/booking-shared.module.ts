import { Module } from '@nestjs/common';
import { SubscriptionsModule } from '@/modules/finance/subscriptions';
import { TeachersModule } from '@/modules/people/teachers';
import { SalesModule } from '@/modules/sales/sales';
import { LessonLinksModule } from '@/modules/teaching/lesson-links';
import { SchedulingModule } from '@/modules/teaching/scheduling';
import { BookingSettings } from './booking.settings';
import { BookingFollowUps } from './core/booking.follow-ups';
import { BookingParties } from './core/booking.parties';
import { BookingRepo } from './core/booking.repo';
import { BookingService } from './core/booking.service';
import { BookingWriter } from './core/booking.writer';
import { BookingInvoices } from './invoice/booking.invoice';
import { BookingPlanner } from './plan/booking.planner';
import { SalesBookingScope } from './sales/booking/sales-booking.ownership';
import { SalesBookingService } from './sales/booking/sales-booking.service';
import { CourseDraftRepo } from './sales/course-draft/course-draft.repo';
import { SalesCourseRepo } from './sales/course/sales-course.repo';
import { SalesCourse } from './sales/course/sales-course.service';
import { TeacherAlertRepo } from './teacher/teacher-alert.repo';
import { TeacherAlert, TeacherAlertDeps } from './teacher/teacher-alert.service';
import { TeacherOptionsRepo } from './teacher/teacher-options.repo';
import { TeacherOptionsService } from './teacher/teacher-options.service';
import { TrialDateRepo } from './trial-date/trial-date.repo';

/**
 * What two or more booking feature modules inject: the booking pipeline (plan, write, follow-ups,
 * teacher alert), the teacher options, and the sales scope with the sales course reads and drafts
 * that the sales, course-change and trial-date features share.
 */
@Module({
  imports: [TeachersModule, SchedulingModule, SalesModule, SubscriptionsModule, LessonLinksModule],
  providers: [
    ...[BookingSettings, BookingRepo, BookingParties, BookingPlanner, BookingWriter],
    ...[BookingFollowUps, BookingService, BookingInvoices, TeacherAlert, TeacherAlertDeps],
    ...[TeacherAlertRepo, TeacherOptionsRepo, TeacherOptionsService, TrialDateRepo],
    ...[SalesBookingScope, SalesBookingService, SalesCourse, SalesCourseRepo, CourseDraftRepo],
  ],
  exports: [
    ...[BookingSettings, BookingRepo, BookingPlanner, BookingFollowUps, BookingService],
    ...[BookingInvoices, TeacherAlert, TeacherOptionsService, TrialDateRepo, SalesBookingScope],
    ...[SalesBookingService, SalesCourse, SalesCourseRepo, CourseDraftRepo],
  ],
})
export class BookingSharedModule {}
