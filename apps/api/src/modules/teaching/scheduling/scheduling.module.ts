import { Module } from '@nestjs/common';
import { TeachersModule } from '../../people/teachers/teachers.module';
import { BusyQueries } from './conflicts/busy.queries';
import { ConflictChecker } from './conflicts/conflict-checker';
import { HorizonJob } from './occurrences/horizon.job';
import { LessonWriter } from './occurrences/lesson-writer';
import { OccurrenceGenerator } from './occurrences/occurrence-generator';
import { RuleExtendService } from './rules/rule-extend.service';
import { RuleProjectionQueries } from './rules/rule-projection.queries';
import { ScheduleRulesController } from './rules/schedule-rules.controller';
import { ScheduleQueries } from './schedule.queries';
import { SchedulingSettings } from './scheduling.settings';

/**
 * Schedule rules + OccurrenceGenerator: idempotent horizon upsert, POST /schedule-rules/:id/extend
 * and the daily refresh. R-SCH-02, R-SCH-04, R-SCH-07. Pure math: ./occurrences.ts, ./conflicts.ts.
 */
@Module({
  imports: [TeachersModule],
  controllers: [ScheduleRulesController],
  providers: [
    BusyQueries,
    ConflictChecker,
    HorizonJob,
    LessonWriter,
    OccurrenceGenerator,
    RuleExtendService,
    RuleProjectionQueries,
    ScheduleQueries,
    SchedulingSettings,
  ],
  exports: [BusyQueries, ConflictChecker, LessonWriter, OccurrenceGenerator, ScheduleQueries, SchedulingSettings],
})
export class SchedulingModule {}
