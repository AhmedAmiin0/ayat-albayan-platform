import { Module } from '@nestjs/common';
import { SalesModule } from '../sales/sales.module';
import { SchedulingModule } from '../scheduling/scheduling.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { TeachersModule } from '../teachers/teachers.module';
import { BookingExtrasController } from './booking-extras.controller';
import { BookingFollowUps } from './core/booking.follow-ups';
import { BookingController } from './booking.controller';
import { BookingInvoices } from './invoice/booking.invoice';
import { BookingParties } from './core/booking.parties';
import { BookingPlanner } from './plan/booking.planner';
import { BookingQueries } from './core/booking.queries';
import { BookingService } from './core/booking.service';
import { BookingSettings } from './booking.settings';
import { BookingWriter } from './core/booking.writer';
import { ConflictContext } from './plan/conflict-context';
import { CourseChangeController } from './course-change/course-change.controller';
import { CourseLessonQueries } from './course-change/course-change.lessons';
import { CourseChangePlanner } from './course-change/course-change.planner';
import { CourseChangeQueries } from './course-change/course-change.queries';
import { CourseChange } from './course-change/course-change.service';
import { CourseChangeViews } from './course-change/course-change.view';
import { CourseChangeDeps, CourseChangeWriter } from './course-change/course-change.writer';
import { InstantController } from './instant/instant.controller';
import { InstantQueries } from './instant/instant.queries';
import { InstantLessonService } from './instant/instant.service';
import { MakeupCandidates } from './makeup/makeup-candidates.service';
import { SalesBookingController, SalesBookingOptionsController } from './sales/booking/sales-booking.controller';
import { SalesBookingScope } from './sales/booking/sales-booking.ownership';
import { SalesBookingOptions, SalesBookingService } from './sales/booking/sales-booking.service';
import { SalesCourseController } from './sales/course/sales-course.controller';
import { SalesCourseQueries } from './sales/course/sales-course.queries';
import { SalesCourse } from './sales/course/sales-course.service';
import { SlotsService } from './plan/slots.service';
import { TeacherAlertQueries } from './teacher/teacher-alert.queries';
import { TeacherAlert, TeacherAlertDeps } from './teacher/teacher-alert.service';
import { TeacherOptionsQueries } from './teacher/teacher-options.queries';
import { TeacherOptionsService } from './teacher/teacher-options.service';
import { SalesTrialDateController, TrialDateController } from './trial-date/trial-date.controller';
import { TrialDateQueries } from './trial-date/trial-date.queries';
import { TrialDateDeps, TrialDates } from './trial-date/trial-date.service';
import { SalesTrialDates } from './sales/course/sales-trial-date.service';

/**
 * Booking wizard: teacher filter, slot grid with conflict reasons, POST /booking in one transaction,
 * makeup candidates and the invoice upload (R-SCH-10, R-PAY-03; InboundMedia comes from the global
 * WhatsappModule, StorageService from the global StorageModule), and «حلقة فورية» (POST /lessons/instant).
 * SubscriptionsModule brings StudentTrialStatus (a trial booking: new → trial, owner 2026-10-15).
 * R-SCH-04, R-SCH-06, R-LEAD-06. Owner: Phase 2 builder B2 (docs/10-phase2-contracts.md §1).
 */
@Module({
  imports: [TeachersModule, SchedulingModule, SalesModule, SubscriptionsModule],
  controllers: [BookingController, BookingExtrasController, InstantController, SalesBookingController, SalesBookingOptionsController, SalesCourseController, CourseChangeController, TrialDateController, SalesTrialDateController],
  providers: [
    BookingSettings,
    BookingQueries,
    TeacherOptionsQueries,
    ConflictContext,
    TeacherOptionsService,
    SlotsService,
    BookingParties,
    BookingPlanner,
    BookingService,
    SalesBookingScope,
    SalesBookingService,
    SalesBookingOptions,
    SalesCourse,
    SalesCourseQueries,
    CourseChange,
    CourseChangeQueries,
    CourseLessonQueries,
    CourseChangePlanner,
    CourseChangeViews,
    CourseChangeDeps,
    CourseChangeWriter,
    BookingWriter,
    BookingFollowUps,
    TeacherAlert,
    TeacherAlertDeps,
    TeacherAlertQueries,
    BookingInvoices,
    MakeupCandidates,
    InstantQueries,
    InstantLessonService,
    TrialDateQueries,
    TrialDates,
    TrialDateDeps,
    SalesTrialDates,
  ],
})
export class BookingModule {}
