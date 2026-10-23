import { Module } from '@nestjs/common';
import { TeachersModule } from '../teachers/teachers.module';
import { BusyQueries } from './busy.queries';
import { ConflictChecker } from './conflict-checker';
import { HorizonJob } from './horizon.job';
import { LessonWriter } from './lesson-writer';
import { OccurrenceGenerator } from './occurrence-generator';
import { RuleExtendService } from './rule-extend.service';
import { RuleProjectionQueries } from './rule-projection.queries';
import { ScheduleRulesController } from './schedule-rules.controller';
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
  exports: [BusyQueries, ConflictChecker, LessonWriter, OccurrenceGenerator, ScheduleQueries],
})
export class SchedulingModule {}
