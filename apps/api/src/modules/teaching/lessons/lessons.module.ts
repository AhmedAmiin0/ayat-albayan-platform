import { Module } from '@nestjs/common';
import { TeachersModule } from '@/modules/people/teachers';
import { LessonAutoHeldModule } from '@/modules/teaching/lessons/auto-held';
import { FamilyRequestsModule } from '@/modules/teaching/lessons/family-requests';
import { LessonProposalsModule } from '@/modules/teaching/lessons/proposals';
import { LessonRescheduleModule } from '@/modules/teaching/lessons/reschedule';
import { LessonStatusModule } from '@/modules/teaching/lessons/status';
import { LessonStoreModule } from '@/modules/teaching/lessons/store';
import { TeacherMeModule } from '@/modules/teaching/lessons/teacher-me';
import { LessonTimeModule } from '@/modules/teaching/lessons/time-edit';
import { LessonsController } from './lessons.controller';
import { OverviewRepo } from './overview/overview.repo';
import { OverviewService } from './overview/overview.service';
import { StudentLessonsController } from './student-lessons.controller';

/** Lesson lists, confirm, status, reschedule, cancel and the teacher's own routes (R-SCH). */
@Module({
  imports: [
    ...[TeachersModule, LessonStoreModule, LessonAutoHeldModule, LessonStatusModule],
    ...[LessonRescheduleModule, LessonProposalsModule, FamilyRequestsModule],
    ...[TeacherMeModule, LessonTimeModule],
  ],
  controllers: [LessonsController, StudentLessonsController],
  providers: [OverviewRepo, OverviewService],
  exports: [
    ...[LessonStoreModule, LessonAutoHeldModule, LessonStatusModule],
    ...[LessonRescheduleModule, FamilyRequestsModule, TeacherMeModule],
  ],
})
export class LessonsModule {}
