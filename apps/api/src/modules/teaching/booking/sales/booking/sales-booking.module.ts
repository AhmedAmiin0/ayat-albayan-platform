import { Module } from '@nestjs/common';
import { BookingSharedModule } from '@/modules/teaching/booking/booking-shared.module';
import { SlotsModule } from '@/modules/teaching/booking/plan';
import { SalesBookingController, SalesBookingOptionsController } from './sales-booking.controller';
import { SalesBookingOptions } from './sales-booking.service';

@Module({
  imports: [BookingSharedModule, SlotsModule],
  controllers: [SalesBookingController, SalesBookingOptionsController],
  providers: [SalesBookingOptions],
})
export class SalesBookingModule {}
