import { Module } from '@nestjs/common';
import { TeachersModule } from '@/modules/people/teachers';
import { BookingSharedModule } from '@/modules/teaching/booking/booking-shared.module';
import { SchedulingModule } from '@/modules/teaching/scheduling';
import { ConflictContext } from './conflict-context';
import { SlotsService } from './slots.service';

/** The slot grid alone, so the booking module re-exports just SlotsService to the portal. */
@Module({
  imports: [BookingSharedModule, TeachersModule, SchedulingModule],
  providers: [ConflictContext, SlotsService],
  exports: [SlotsService],
})
export class SlotsModule {}
