import { Module } from '@nestjs/common';
import { SchedulingModule } from '@/modules/teaching/scheduling/scheduling.module';
import { SubscriptionsModule } from '@/modules/finance/subscriptions/subscriptions.module';
import { TeachersModule } from '@/modules/people/teachers/teachers.module';
import { ScheduleNoticesModule } from '@/modules/teaching/schedule-notices';
import { LessonAccess } from './store/lesson-access';
import { LessonActionsController } from './status/lesson-actions.controller';
import { LessonCancelService } from './status/lesson-cancel.service';
import { LessonProposalsController } from './proposals/lesson-proposals.controller';
import { LessonProposalRepo } from './proposals/lesson-proposals.repo';
import { LessonProposeService, ProposalDecisionService } from './proposals/lesson-proposals.service';
import { LessonRescheduleController } from './reschedule/lesson-reschedule.controller';
import { LessonTimeController } from './time-edit/lesson-time.controller';
import { LessonStatusService } from './status/lesson-status.service';
import { LessonStore } from './store/lesson-store';
import { LessonViews } from './store/lesson-views';
import { LessonsController } from './lessons.controller';
import { LessonsRepo } from './lessons.repo';
import { LessonsSettings } from './lessons.settings';
import { OverviewRepo } from './overview/overview.repo';
import { OverviewService } from './overview/overview.service';
import { RescheduleOneService } from './reschedule/reschedule-one.service';
import { RescheduleRuleService } from './reschedule/reschedule-rule.service';
import { RuleCancelController } from './reschedule/rule-cancel.controller';
import { RulePlanner } from './reschedule/rule-planner';
import { StudentLessonsController } from './student-lessons.controller';
import { LessonTimeService } from './time-edit/time-edit.service';
import { TimeEditPayout } from './time-edit/time-edit.payout';
import { TimeEditRepo } from './time-edit/time-edit.repo';
import { TeacherMeController } from './teacher-me/teacher-me.controller';
import { TeacherMeRepo } from './teacher-me/teacher-me.repo';

/**
 * Lesson lists (week / day / student), confirm, status, reschedule, cancel, and the teacher's own
 * routes (/teachers/me, /teachers/me/lessons, «اقترح ميعاد تاني» proposals). R-SCH-03, R-SCH-07,
 * R-SCH-08, R-TCH-03, R-LES-01..03.
 * LessonStatusService.confirm is exported for the Phase 4 WhatsApp webhook («نعم» → confirm);
 * TeacherMeQueries for the teacher-mode inbox (which children of a guardian the teacher sees);
 * RescheduleOneService and LessonCancelService for sales' one-lesson move / cancel (docs/16 row 37).
 * GET /lessons/overview is the all-teachers calendar (R-SCH-09). PATCH /lessons/:id/time is
 * «عدّل الوقت» (R-SCH-11): one lesson edited in place.
 */
@Module({
  imports: [SchedulingModule, SubscriptionsModule, TeachersModule, ScheduleNoticesModule],
  controllers: [
    LessonsController,
    LessonActionsController,
    LessonProposalsController,
    LessonRescheduleController,
    LessonTimeController,
    RuleCancelController,
    StudentLessonsController,
    TeacherMeController,
  ],
  providers: [
    LessonAccess,
    LessonCancelService,
    LessonProposalRepo,
    LessonProposeService,
    LessonStatusService,
    LessonStore,
    LessonTimeService,
    LessonViews,
    LessonsRepo,
    LessonsSettings,
    OverviewRepo,
    OverviewService,
    ProposalDecisionService,
    RescheduleOneService,
    RescheduleRuleService,
    RulePlanner,
    TeacherMeRepo,
    TimeEditPayout,
    TimeEditRepo,
  ],
  exports: [LessonCancelService, LessonStatusService, LessonViews, RescheduleOneService, TeacherMeRepo],
})
export class LessonsModule {}
