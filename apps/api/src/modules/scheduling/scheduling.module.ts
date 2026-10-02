import { Module } from '@nestjs/common';
import { AvailabilityQueries } from '../teachers/availability/availability.queries';
import { BusyQueries } from './busy.queries';
import { ConflictChecker } from './conflict-checker';
import { HorizonJob } from './horizon.job';
import { LessonWriter } from './lesson-writer';
import { OccurrenceGenerator } from './occurrence-generator';
import { RuleExtendService } from './rule-extend.service';
import { ScheduleRulesController } from './schedule-rules.controller';
import { ScheduleQueries } from './schedule.queries';

/**
 * Schedule rules + OccurrenceGenerator: idempotent horizon upsert, POST /schedule-rules/:id/extend
 * and the daily refresh. R-SCH-02, R-SCH-04, R-SCH-07. Pure math: ./occurrences.ts, ./conflicts.ts.
 * AvailabilityQueries is provided here too because TeachersModule doesn't export it (stateless).
 */
@Module({
  controllers: [ScheduleRulesController],
  providers: [
    AvailabilityQueries,
    BusyQueries,
    ConflictChecker,
    HorizonJob,
    LessonWriter,
    OccurrenceGenerator,
    RuleExtendService,
    ScheduleQueries,
  ],
  exports: [ConflictChecker, LessonWriter, OccurrenceGenerator, ScheduleQueries],
})
export class SchedulingModule {}
