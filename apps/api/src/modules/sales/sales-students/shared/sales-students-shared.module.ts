import { Module } from '@nestjs/common';
import { SalesModule } from '@/modules/sales/sales';
import { TrialDateRepo } from '@/modules/teaching/booking';
import { SalesStudentScope } from './sales-student-scope';
import { SalesStudentRepo } from './sales-student.repo';

/** What the details, lessons and attendance folders inject: the sales scope and its repo. */
@Module({
  imports: [SalesModule],
  providers: [SalesStudentScope, SalesStudentRepo, TrialDateRepo],
  exports: [SalesStudentScope, SalesStudentRepo],
})
export class SalesStudentsSharedModule {}
