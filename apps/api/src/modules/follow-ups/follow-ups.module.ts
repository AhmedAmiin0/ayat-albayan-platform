import { Module } from '@nestjs/common';
import { TeachersModule } from '../teachers/teachers.module';
import { FollowUpSlots } from './follow-up-slots';
import { FollowUpsReads } from './follow-ups.deps';
import { FollowUpsJob } from './follow-ups.job';
import { FollowUpsQueries } from './follow-ups.queries';
import { FollowUpsSettings } from './follow-ups.settings';

/**
 * R-LEAD-05 lead follow-ups with two real free slots (docs/12 §7). TeachersModule exports
 * AvailabilityQuery; DB is global and FollowUpsSettings reads the global settings store. Register in app.module.ts.
 */
@Module({
  imports: [TeachersModule],
  providers: [FollowUpsQueries, FollowUpsSettings, FollowUpsReads, FollowUpSlots, FollowUpsJob],
  exports: [FollowUpsJob],
})
export class FollowUpsModule {}
