import { Module } from '@nestjs/common';
import { SalesTeacherAssign } from './sales-teacher-assign';

/** «المعلم/ة» of the subscribe step: the bank path and the Stripe payment link. */
@Module({
  providers: [SalesTeacherAssign],
  exports: [SalesTeacherAssign],
})
export class SalesTeacherAssignModule {}
