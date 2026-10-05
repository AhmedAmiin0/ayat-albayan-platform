import { DEFAULT_DURATION } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { SettingsService } from '../../common/settings/settings.service';
import { AvailabilityQuery } from '../teachers/availability/availability.query';
import { FollowUpsQueries } from './follow-ups.queries';

const HOUR = 60 * 60_000;

/**
 * Real free starts for a follow-up (R-LEAD-05): every active teacher's weekly grid − time-off −
 * booked lessons (AvailabilityQuery.freeSlots), lesson-length (the pricing default) slots, from
 * settings.follow_up_slots_from_hours (12) to follow_up_slots_to_days (7) ahead (docs/12 §7).
 * The lead's qualification has no program or teacher-gender preference (R-LEAD-03), so every
 * active teacher counts. TODO(owner): narrow by program / teacher gender once the lead has them.
 */
@Injectable()
export class FollowUpSlots {
  constructor(
    private readonly queries: FollowUpsQueries,
    private readonly availability: AvailabilityQuery,
    private readonly settings: SettingsService,
  ) {}

  async freeStarts(now: Date): Promise<Date[]> {
    const s = await this.settings.all();
    const from = new Date(now.getTime() + s.follow_up_slots_from_hours * HOUR);
    const to = new Date(now.getTime() + s.follow_up_slots_to_days * 24 * HOUR);
    if (to <= from) return [];
    const ids = await this.queries.activeTeacherIds();
    const slots = await Promise.all(
      ids.map((teacherId) => this.availability.freeSlots({ teacherId, from, to, durationMin: DEFAULT_DURATION })),
    );
    return slots.flat().map((s) => s.start);
  }
}
