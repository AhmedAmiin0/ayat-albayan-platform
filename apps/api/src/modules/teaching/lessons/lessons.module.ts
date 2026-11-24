import { Module } from '@nestjs/common';
import { SchedulingModule } from '@/modules/teaching/scheduling/scheduling.module';
import { SubscriptionsModule } from '@/modules/finance/subscriptions/subscriptions.module';
import { TeachersModule } from '@/modules/people/teachers/teachers.module';
import { ScheduleNoticesModule } from '@/modules/teaching/schedule-notices';
import { AutoHeldCorrection } from './auto-held/auto-held-correction';
import { AutoHeldJob } from './auto-held/auto-held.job';
import { AutoHeldRepo } from './auto-held/auto-held.repo';
import { AutoHeldService } from './auto-held/auto-held.service';
import { OutcomeSettleService } from './auto-held/outcome-settle.service';
import { OutcomeCorrection } from './auto-held/outcome-correction';
import { LessonAccess } from './store/lesson-access';
import { LessonActionsController } from './status/lesson-actions.controller';
import { LessonCancelService } from './status/lesson-cancel.service';
import { LessonProposalsController } from './proposals/lesson-proposals.controller';
import { RequestDeclinePush } from './proposals/request-decline.push';
import { FamilyRequestAccess } from './family-requests/family-request.access';
import { FamilyRequestService } from './family-requests/family-request.service';
import { FamilyRequestsController } from './family-requests/family-requests.controller';
import { LessonProposalRepo } from './proposals/lesson-proposals.repo';
import { LessonProposeService, ProposalDecisionService } from './proposals/lesson-proposals.service';
import { LessonRescheduleController } from './reschedule/lesson-reschedule.controller';
import { LessonTimeController } from './time-edit/lesson-time.controller';
import { LessonStatusService } from './status/lesson-status.service';
import { LessonStore } from './store/lesson-store';
import { LessonViews } from './store/lesson-views';
import { LessonViewExtras } from './store/lesson-view-extras';
import { LessonRoomStates } from './live-room/lesson-room-states';
import { RoomInsideRepo } from './live-room/room-inside.repo';
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
import { TeacherCancelPush } from './teacher-me/teacher-cancel.push';
import { TeacherCancelRepo } from './teacher-me/teacher-cancel.repo';
import { TeacherConfirmRepo } from './teacher-me/teacher-confirm.repo';
import { TeacherLessonController } from './teacher-me/teacher-lesson.controller';
import { TeacherLessonDeps, TeacherLessonService } from './teacher-me/teacher-lesson.service';

/** Lesson lists, confirm, status, reschedule, cancel and the teacher's own routes (R-SCH). */
@Module({
  imports: [SchedulingModule, SubscriptionsModule, TeachersModule, ScheduleNoticesModule],
  controllers: [
    LessonsController,
    LessonActionsController,
    LessonProposalsController,
    FamilyRequestsController,
    LessonRescheduleController,
    LessonTimeController,
    RuleCancelController,
    StudentLessonsController,
    TeacherMeController,
    TeacherLessonController,
  ],
  providers: [
    AutoHeldCorrection,
    AutoHeldJob,
    AutoHeldRepo,
    AutoHeldService,
    OutcomeSettleService,
    OutcomeCorrection,
    LessonAccess,
    LessonCancelService,
    LessonProposalRepo,
    FamilyRequestAccess,
    FamilyRequestService,
    RequestDeclinePush,
    LessonProposeService,
    LessonStatusService,
    LessonStore,
    LessonTimeService,
    LessonViews,
    LessonViewExtras,
    LessonRoomStates,
    RoomInsideRepo,
    LessonsRepo,
    LessonsSettings,
    OverviewRepo,
    OverviewService,
    ProposalDecisionService,
    RescheduleOneService,
    RescheduleRuleService,
    RulePlanner,
    TeacherCancelPush,
    TeacherCancelRepo,
    TeacherConfirmRepo,
    TeacherLessonDeps,
    TeacherLessonService,
    TeacherMeRepo,
    TimeEditPayout,
    TimeEditRepo,
  ],
  exports: [
    FamilyRequestService,
    LessonCancelService,
    LessonRoomStates,
    LessonStatusService,
    LessonViews,
    OutcomeCorrection,
    RescheduleOneService,
    TeacherMeRepo,
  ],
})
export class LessonsModule {}
