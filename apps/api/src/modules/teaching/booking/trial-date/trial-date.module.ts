import { Module } from '@nestjs/common';
import { BookingSharedModule } from '@/modules/teaching/booking/booking-shared.module';
import { ScheduleNoticesModule } from '@/modules/teaching/schedule-notices';
import { SalesTrialDates } from './sales-trial-date.service';
import { SalesTrialDateController, TrialDateController } from './trial-date.controller';
import { TrialDateDeps, TrialDates } from './trial-date.service';

@Module({
  imports: [BookingSharedModule, ScheduleNoticesModule],
  controllers: [TrialDateController, SalesTrialDateController],
  providers: [TrialDates, TrialDateDeps, SalesTrialDates],
})
export class TrialDateModule {}
