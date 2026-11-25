import { Module } from '@nestjs/common';
import {
  SalesTeacherOverviewController,
  SalesTeacherOverviewService,
} from './sales-teacher-overview.controller';
import { SalesTeacherOverviewRepo } from './sales-teacher-overview.repo';

@Module({
  controllers: [SalesTeacherOverviewController],
  providers: [SalesTeacherOverviewRepo, SalesTeacherOverviewService],
})
export class SalesTeacherOverviewModule {}
