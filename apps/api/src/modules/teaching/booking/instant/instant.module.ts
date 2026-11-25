import { Module } from '@nestjs/common';
import { BookingSharedModule } from '@/modules/teaching/booking/booking-shared.module';
import { SchedulingModule } from '@/modules/teaching/scheduling';
import { InstantController } from './instant.controller';
import { InstantRepo } from './instant.repo';
import { InstantLessonService } from './instant.service';

@Module({
  imports: [BookingSharedModule, SchedulingModule],
  controllers: [InstantController],
  providers: [InstantRepo, InstantLessonService],
})
export class InstantModule {}
