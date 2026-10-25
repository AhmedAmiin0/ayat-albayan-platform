import { Module } from '@nestjs/common';
import { SalesModule } from '../sales/sales.module';
import { SchedulingModule } from '../scheduling/scheduling.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { TeachersModule } from '../teachers/teachers.module';
import { BookingExtrasController } from './booking-extras.controller';
import { BookingFollowUps } from './booking.follow-ups';
import { BookingController } from './booking.controller';
import { BookingInvoices } from './booking.invoice';
import { BookingParties } from './booking.parties';
import { BookingPlanner } from './booking.planner';
import { BookingQueries } from './booking.queries';
import { BookingService } from './booking.service';
import { BookingSettings } from './booking.settings';
import { BookingWriter } from './booking.writer';
import { ConflictContext } from './conflict-context';
import { CourseChangeController } from './course-change.controller';
import { CourseLessonQueries } from './course-change.lessons';
import { CourseChangePlanner } from './course-change.planner';
import { CourseChangeQueries } from './course-change.queries';
import { CourseChange } from './course-change.service';
import { CourseChangeViews } from './course-change.view';
import { CourseChangeDeps, CourseChangeWriter } from './course-change.writer';
import { InstantController } from './instant.controller';
import { InstantQueries } from './instant.queries';
import { InstantLessonService } from './instant.service';
import { MakeupCandidates } from './makeup-candidates.service';
import { SalesBookingController, SalesBookingOptionsController } from './sales-booking.controller';
import { SalesBookingScope } from './sales-booking.ownership';
import { SalesBookingOptions, SalesBookingService } from './sales-booking.service';
import { SalesCourseController } from './sales-course.controller';
import { SalesCourseQueries } from './sales-course.queries';
import { SalesCourse } from './sales-course.service';
import { SlotsService } from './slots.service';
import { TeacherAlertQueries } from './teacher-alert.queries';
import { TeacherAlert, TeacherAlertDeps } from './teacher-alert.service';
import { TeacherOptionsQueries } from './teacher-options.queries';
import { TeacherOptionsService } from './teacher-options.service';
import { SalesTrialDateController, TrialDateController } from './trial-date.controller';
import { TrialDateQueries } from './trial-date.queries';
import { TrialDateDeps, TrialDates } from './trial-date.service';
import { SalesTrialDates } from './sales-trial-date.service';

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
