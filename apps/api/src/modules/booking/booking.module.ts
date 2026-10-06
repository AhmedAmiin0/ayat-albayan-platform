import { Module } from '@nestjs/common';
import { SalesModule } from '../sales/sales.module';
import { SchedulingModule } from '../scheduling/scheduling.module';
import { TeachersModule } from '../teachers/teachers.module';
import { BookingExtrasController } from './booking-extras.controller';
import { BookingController } from './booking.controller';
import { BookingInvoices } from './booking.invoice';
import { BookingParties } from './booking.parties';
import { BookingPlanner } from './booking.planner';
import { BookingQueries } from './booking.queries';
import { BookingService } from './booking.service';
import { BookingWriter } from './booking.writer';
import { ConflictContext } from './conflict-context';
import { InstantController } from './instant.controller';
import { InstantQueries } from './instant.queries';
import { InstantLessonService } from './instant.service';
import { MakeupCandidates } from './makeup-candidates.service';
import { SalesBookingController, SalesBookingOptionsController } from './sales-booking.controller';
import { SalesBookingOptions, SalesBookingService } from './sales-booking.service';
import { SlotsService } from './slots.service';
import { TeacherOptionsQueries } from './teacher-options.queries';
import { TeacherOptionsService } from './teacher-options.service';

/**
 * Booking wizard: teacher filter, slot grid with conflict reasons, POST /booking in one transaction,
 * makeup candidates and the invoice upload (R-SCH-10, R-PAY-03; InboundMedia comes from the global
 * WhatsappModule, StorageService from the global StorageModule), and «حلقة فورية» (POST /lessons/instant).
 * R-SCH-04, R-SCH-06, R-LEAD-06. Owner: Phase 2 builder B2 (docs/10-phase2-contracts.md §1).
 */
@Module({
  imports: [TeachersModule, SchedulingModule, SalesModule],
  controllers: [BookingController, BookingExtrasController, InstantController, SalesBookingController, SalesBookingOptionsController],
  providers: [
    BookingQueries,
    TeacherOptionsQueries,
    ConflictContext,
    TeacherOptionsService,
    SlotsService,
    BookingParties,
    BookingPlanner,
    BookingService,
    SalesBookingService,
    SalesBookingOptions,
    BookingWriter,
    BookingInvoices,
    MakeupCandidates,
    InstantQueries,
    InstantLessonService,
  ],
})
export class BookingModule {}
