import { Module } from '@nestjs/common';
import { TeachersModule } from '../teachers/teachers.module';
import { PayoutsController, TeacherPayoutsController } from './payouts.controller';
import { PayoutsGenerator } from './payouts.generate';
import { PayoutsQueries } from './payouts.queries';
import { PayoutsService } from './payouts.service';

/**
 * Teacher payouts: generate a month, approve, pay; a teacher reads own. R-PAY-02, R-TCH-04.
 * Routes Y1–Y5 (docs/11 §8). PayoutsQueries is exported for the CSV export (B4).
 */
@Module({
  imports: [TeachersModule],
  controllers: [PayoutsController, TeacherPayoutsController],
  providers: [PayoutsGenerator, PayoutsQueries, PayoutsService],
  exports: [PayoutsQueries, PayoutsService],
})
export class PayoutsModule {}
