import { DEFAULT_DURATION } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { AvailabilityQuery } from '../teachers/availability/availability.query';
import { FollowUpsQueries } from './follow-ups.queries';

const HOUR = 60 * 60_000;
/** docs/12 §7: proposals start at least 12 h ahead … */
export const SLOTS_FROM_MS = 12 * HOUR;
/** … and within the next 7 days. */
export const SLOTS_TO_MS = 7 * 24 * HOUR;

/**
 * Real free starts for a follow-up (R-LEAD-05): every active teacher's weekly grid − time-off −
 * booked lessons (AvailabilityQuery.freeSlots), lesson-length (the pricing default) slots.
 * The lead's qualification has no program or teacher-gender preference (R-LEAD-03), so every
 * active teacher counts. TODO(owner): narrow by program / teacher gender once the lead has them.
 */
@Injectable()
export class FollowUpSlots {
  constructor(
    private readonly queries: FollowUpsQueries,
    private readonly availability: AvailabilityQuery,
  ) {}

  async freeStarts(now: Date): Promise<Date[]> {
    const from = new Date(now.getTime() + SLOTS_FROM_MS);
    const to = new Date(now.getTime() + SLOTS_TO_MS);
    const ids = await this.queries.activeTeacherIds();
    const slots = await Promise.all(
      ids.map((teacherId) => this.availability.freeSlots({ teacherId, from, to, durationMin: DEFAULT_DURATION })),
    );
    return slots.flat().map((s) => s.start);
  }
}
