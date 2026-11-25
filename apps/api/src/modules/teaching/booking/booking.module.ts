import { Module } from '@nestjs/common';
import { CourseCardModule } from '@/modules/teaching/booking/card';
import { CourseExtendModule } from '@/modules/teaching/booking/extend';
import { InstantModule } from '@/modules/teaching/booking/instant';
import { SlotsModule } from '@/modules/teaching/booking/plan';
import { ProfileCourseModule } from '@/modules/teaching/booking/profile';
import { SalesBookingModule } from '@/modules/teaching/booking/sales/booking';
import { SalesCourseModule } from '@/modules/teaching/booking/sales/course';
import { TrialDateModule } from '@/modules/teaching/booking/trial-date';
import { BookingExtrasController } from './booking-extras.controller';
import { BookingSharedModule } from './booking-shared.module';
import { BookingController } from './booking.controller';
import { CourseChangeModule } from './course-change.module';
import { MakeupCandidates } from './core/makeup/makeup-candidates.service';

/**
 * R-SCH-04/06/10, R-PAY-03, R-LEAD-06; contracts in docs/10-phase2-contracts.md §1. The portal
 * books from the slot grid, so the slots module is re-exported.
 */
@Module({
  imports: [
    ...[BookingSharedModule, SlotsModule, InstantModule, SalesBookingModule, SalesCourseModule],
    ...[CourseChangeModule, ProfileCourseModule, CourseCardModule, CourseExtendModule],
    TrialDateModule,
  ],
  controllers: [BookingController, BookingExtrasController],
  providers: [MakeupCandidates],
  exports: [SlotsModule],
})
export class BookingModule {}
