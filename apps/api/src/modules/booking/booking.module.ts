import { Module } from '@nestjs/common';
import { AvailabilityQueries } from '../teachers/availability/availability.queries';
import { BookingController } from './booking.controller';
import { BookingPlanner } from './booking.planner';
import { BookingQueries } from './booking.queries';
import { BookingService } from './booking.service';
import { ConflictContext } from './conflict-context';
import { SlotsService } from './slots.service';
import { TeacherOptionsQueries } from './teacher-options.queries';
import { TeacherOptionsService } from './teacher-options.service';

/**
 * Booking wizard: teacher filter, slot grid with conflict reasons, POST /booking in one transaction.
 * R-SCH-04, R-SCH-06, R-LEAD-06. Owner: Phase 2 builder B2 (docs/10-phase2-contracts.md §1).
 * AvailabilityQueries is stateless (DB only), so it is provided here rather than re-exported.
 */
@Module({
  controllers: [BookingController],
  providers: [
    AvailabilityQueries,
    BookingQueries,
    TeacherOptionsQueries,
    ConflictContext,
    TeacherOptionsService,
    SlotsService,
    BookingPlanner,
    BookingService,
  ],
})
export class BookingModule {}
