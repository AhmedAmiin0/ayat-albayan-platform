import { Module } from '@nestjs/common';
import { SchedulingModule } from '../scheduling/scheduling.module';
import { TeachersModule } from '../teachers/teachers.module';
import { LessonAccess } from './lesson-access';
import { LessonActionsController } from './lesson-actions.controller';
import { LessonCancelService } from './lesson-cancel.service';
import { LessonProposalsController } from './lesson-proposals.controller';
import { LessonProposalQueries } from './lesson-proposals.queries';
import { LessonProposeService, ProposalDecisionService } from './lesson-proposals.service';
import { LessonRescheduleController } from './lesson-reschedule.controller';
import { LessonStatusService } from './lesson-status.service';
import { LessonStore } from './lesson-store';
import { LessonViews } from './lesson-views';
import { LessonsController } from './lessons.controller';
import { LessonsQueries } from './lessons.queries';
import { RescheduleOneService } from './reschedule-one.service';
import { RescheduleRuleService } from './reschedule-rule.service';
import { RuleCancelController } from './rule-cancel.controller';
import { RulePlanner } from './rule-planner';
import { StudentLessonsController } from './student-lessons.controller';
import { TeacherMeController } from './teacher-me.controller';
import { TeacherMeQueries } from './teacher-me.queries';

/**
 * Lesson lists (week / day / student), confirm, status, reschedule, cancel, and the teacher's own
 * routes (/teachers/me, /teachers/me/lessons, «اقترح ميعاد تاني» proposals). R-SCH-03, R-SCH-07,
 * R-SCH-08, R-TCH-03, R-LES-01..03.
 * LessonStatusService.confirm is exported for the Phase 4 WhatsApp webhook («نعم» → confirm).
 */
@Module({
  imports: [SchedulingModule, TeachersModule],
  controllers: [
    LessonsController,
    LessonActionsController,
    LessonProposalsController,
    LessonRescheduleController,
    RuleCancelController,
    StudentLessonsController,
    TeacherMeController,
  ],
  providers: [
    LessonAccess,
    LessonCancelService,
    LessonProposalQueries,
    LessonProposeService,
    LessonStatusService,
    LessonStore,
    LessonViews,
    LessonsQueries,
    ProposalDecisionService,
    RescheduleOneService,
    RescheduleRuleService,
    RulePlanner,
    TeacherMeQueries,
  ],
  exports: [LessonStatusService, LessonViews],
})
export class LessonsModule {}
