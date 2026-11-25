import { Module } from '@nestjs/common';
import { SalesHistoryRepo } from '@/modules/sales/sales/history/sales-history.repo';
import { SalesScheduleRepo } from '@/modules/sales/sales/schedule/sales-schedule.repo';
import { SalesScheduleService } from '@/modules/sales/sales/schedule/sales-schedule.service';
import { SalesSharedModule } from '@/modules/sales/sales/shared';
import { SalesAcademyController } from './sales-academy.controller';
import { SalesAcademyRepo } from './sales-academy.repo';
import { SalesAcademyService } from './sales-academy.service';
import { SalesRosterRepo } from './sales-roster.repo';

/** Academy reads with the day schedule and history; SalesStudents injects roster and history. */
@Module({
  imports: [SalesSharedModule],
  controllers: [SalesAcademyController],
  providers: [
    ...[SalesAcademyRepo, SalesAcademyService, SalesRosterRepo, SalesHistoryRepo],
    ...[SalesScheduleRepo, SalesScheduleService],
  ],
  exports: [SalesHistoryRepo, SalesRosterRepo],
})
export class SalesAcademyModule {}
