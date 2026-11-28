import { Module } from '@nestjs/common';
import { BookingSharedModule } from '@/modules/teaching/booking/booking-shared.module';
import { SlotsModule } from '@/modules/teaching/booking/plan';
import { SalesBookingController } from './sales-booking.controller';
import { SalesBookingOptionsController } from './sales-booking.options.controller';
import { SalesBookingOptions } from './sales-booking-options.service';

@Module({
  imports: [BookingSharedModule, SlotsModule],
  controllers: [SalesBookingController, SalesBookingOptionsController],
  providers: [SalesBookingOptions],
})
export class SalesBookingModule {}
