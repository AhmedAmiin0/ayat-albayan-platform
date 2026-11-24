import { Module } from '@nestjs/common';
import { SalesModule } from '@/modules/sales/sales/sales.module';
import { SchedulingModule } from '@/modules/teaching/scheduling/scheduling.module';
import { SubscriptionsModule } from '@/modules/finance/subscriptions/subscriptions.module';
import { TeachersModule } from '@/modules/people/teachers/teachers.module';
import { LessonLinksModule } from '@/modules/teaching/lesson-links';
import { BookingExtrasController } from './booking-extras.controller';
import { BookingFollowUps } from './core/booking.follow-ups';
import { BookingController } from './booking.controller';
import { BookingInvoices } from './invoice/booking.invoice';
import { BookingParties } from './core/booking.parties';
import { BookingPlanner } from './plan/booking.planner';
import { BookingRepo } from './core/booking.repo';
import { BookingService } from './core/booking.service';
import { BookingSettings } from './booking.settings';
import { BookingWriter } from './core/booking.writer';
import { ConflictContext } from './plan/conflict-context';
import { CourseCardController, SalesCourseCardController } from './card/course-card.controller';
import { CourseCards } from './card/course-card.service';
import { CourseCardCourse } from './card/course-card.course';
import { CourseChangeController } from './course-change/course-change.controller';
import { CourseLessonRepo } from './course-change/course-change.lessons';
import { CourseChangeNotices } from './course-change/notices/course-change.notices';
import { CourseChangePlanner } from './course-change/course-change.planner';
import { CourseChangeRepo } from './course-change/course-change.repo';
import { CourseChange } from './course-change/course-change.service';
import { CourseChangeViews } from './course-change/course-change.view';
import { CourseChangeDeps, CourseChangeWriter } from './course-change/course-change.writer';
import { CourseExtendController } from './extend/course-extend.controller';
import { CourseExtendReader } from './extend/course-extend.reader';
import { CourseExtendRepo } from './extend/course-extend.repo';
import { CourseExtend } from './extend/course-extend.service';
import { InstantController } from './instant/instant.controller';
import { CourseTeacherController, CourseTimesController } from './profile/profile-course.controller';
import { ProfileCourseRepo } from './profile/profile-course.repo';
import { ProfileCourse } from './profile/profile-course.service';
import { InstantRepo } from './instant/instant.repo';
import { InstantLessonService } from './instant/instant.service';
import { MakeupCandidates } from './makeup/makeup-candidates.service';
import { SalesBookingController, SalesBookingOptionsController } from './sales/booking/sales-booking.controller';
import { SalesBookingScope } from './sales/booking/sales-booking.ownership';
import { SalesBookingOptions, SalesBookingService } from './sales/booking/sales-booking.service';
import { SalesCourseController } from './sales/course/sales-course.controller';
import { CourseDraftEnv } from './sales/course-draft/course-draft.env';
import { CourseDraftRepo } from './sales/course-draft/course-draft.repo';
import { CourseDrafts } from './sales/course-draft/course-draft.service';
import { SalesCourseRepo } from './sales/course/sales-course.repo';
import { SalesCourse } from './sales/course/sales-course.service';
import { SlotsService } from './plan/slots.service';
import { TeacherAlertRepo } from './teacher/teacher-alert.repo';
import { TeacherAlert, TeacherAlertDeps } from './teacher/teacher-alert.service';
import { TeacherOptionsRepo } from './teacher/teacher-options.repo';
import { TeacherOptionsService } from './teacher/teacher-options.service';
import { SalesTrialDateController, TrialDateController } from './trial-date/trial-date.controller';
import { TrialDateRepo } from './trial-date/trial-date.repo';
import { TrialDateDeps, TrialDates } from './trial-date/trial-date.service';
import { SalesTrialDates } from './sales/course/sales-trial-date.service';
import { ScheduleNoticesModule } from '@/modules/teaching/schedule-notices';

/** R-SCH-04/06/10, R-PAY-03, R-LEAD-06; contracts in docs/10-phase2-contracts.md §1. */
@Module({
  imports: [
    TeachersModule,
    SchedulingModule,
    SalesModule,
    SubscriptionsModule,
    ScheduleNoticesModule,
    LessonLinksModule,
  ],
  controllers: [
    ...[BookingController, BookingExtrasController, InstantController, SalesBookingController],
    ...[SalesBookingOptionsController, SalesCourseController, CourseChangeController],
    ...[CourseTeacherController, CourseTimesController, TrialDateController, SalesTrialDateController],
    ...[CourseCardController, SalesCourseCardController, CourseExtendController],
  ],
  providers: [
    BookingSettings,
    BookingRepo,
    TeacherOptionsRepo,
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
    SalesCourseRepo,
    CourseDraftEnv,
    CourseDraftRepo,
    CourseDrafts,
    CourseChange,
    CourseChangeRepo,
    CourseLessonRepo,
    CourseChangePlanner,
    CourseChangeViews,
    CourseChangeDeps,
    CourseChangeWriter,
    CourseChangeNotices,
    ProfileCourse,
    ProfileCourseRepo,
    CourseCards,
    CourseCardCourse,
    CourseExtend,
    CourseExtendReader,
    CourseExtendRepo,
    BookingWriter,
    BookingFollowUps,
    TeacherAlert,
    TeacherAlertDeps,
    TeacherAlertRepo,
    BookingInvoices,
    MakeupCandidates,
    InstantRepo,
    InstantLessonService,
    TrialDateRepo,
    TrialDates,
    TrialDateDeps,
    SalesTrialDates,
  ],
  exports: [SlotsService],
})
export class BookingModule {}
