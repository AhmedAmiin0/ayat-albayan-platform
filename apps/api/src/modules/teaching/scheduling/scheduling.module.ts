import { Module } from '@nestjs/common';
import { TeachersModule } from '@/modules/people/teachers/teachers.module';
import { BusyRepo } from './conflicts/busy.repo';
import { ConflictChecker } from './conflicts/conflict-checker';
import { HorizonJob } from './occurrences/horizon.job';
import { LessonWriter } from './occurrences/lesson-writer';
import { OccurrenceGenerator } from './occurrences/occurrence-generator';
import { RuleExtendService } from './rules/rule-extend.service';
import { RuleProjectionRepo } from './rules/rule-projection.repo';
import { ScheduleRulesController } from './rules/schedule-rules.controller';
import { ScheduleRepo } from './schedule.repo';
import { SchedulingSettings } from './scheduling.settings';

/**
 * Schedule rules + OccurrenceGenerator: idempotent horizon upsert, POST /schedule-rules/:id/extend
 * and the daily refresh. R-SCH-02, R-SCH-04, R-SCH-07. Pure math: ./occurrences.ts, ./conflicts.ts.
 */
@Module({
  imports: [TeachersModule],
  controllers: [ScheduleRulesController],
  providers: [
    BusyRepo,
    ConflictChecker,
    HorizonJob,
    LessonWriter,
    OccurrenceGenerator,
    RuleExtendService,
    RuleProjectionRepo,
    ScheduleRepo,
    SchedulingSettings,
  ],
  exports: [BusyRepo, ConflictChecker, LessonWriter, OccurrenceGenerator, ScheduleRepo, SchedulingSettings],
})
export class SchedulingModule {}
