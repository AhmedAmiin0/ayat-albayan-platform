import { Module } from '@nestjs/common';
import { TeachersModule } from '../teachers/teachers.module';
import { FollowUpSlots } from './follow-up-slots';
import { FollowUpsJob } from './follow-ups.job';
import { FollowUpsQueries } from './follow-ups.queries';

/**
 * R-LEAD-05 lead follow-ups with two real free slots (docs/12 §7). TeachersModule exports
 * AvailabilityQuery; DB and SettingsService are global. Register in app.module.ts.
 */
@Module({
  imports: [TeachersModule],
  providers: [FollowUpsQueries, FollowUpSlots, FollowUpsJob],
  exports: [FollowUpsJob],
})
export class FollowUpsModule {}
