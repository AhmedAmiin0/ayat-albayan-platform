import { Module } from '@nestjs/common';

/**
 * Schedule rules + OccurrenceGenerator (horizon upsert, /schedule-rules/:id/cancel|extend).
 * R-SCH-02, R-SCH-07. Owner: Phase 2 builder B1 (docs/10-phase2-contracts.md §1).
 * Pure occurrence math lives in ./occurrences.ts and is shared read-only with booking/lessons.
 */
@Module({})
export class SchedulingModule {}
