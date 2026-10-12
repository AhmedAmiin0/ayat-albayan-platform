import { DEFAULT_MEETING_DURATION, MEETING_MAX_AHEAD_DAYS, plannedEnd, scheduleProblem } from '@ab/shared';
import { BadRequestException } from '@nestjs/common';

// R-MEET-01: a scheduled meeting starts in the future, at most 90 days ahead, and lasts 15..240
// minutes (the schema checks the range). No startsAt = an instant meeting, exactly as before.

export interface ScheduleTimes {
  startsAt: string | null;
  plannedEndAt: string | null;
}

const MIN_MS = 60_000;

/** 400 starts_in_past | too_far_ahead. A duration without a start is ignored (instant). */
export function scheduleTimes(v: { startsAt?: string | undefined; durationMin?: number | undefined }, now: Date): ScheduleTimes {
  if (!v.startsAt) return { startsAt: null, plannedEndAt: null };
  const problem = scheduleProblem(v.startsAt, now, MEETING_MAX_AHEAD_DAYS);
  if (problem) throw new BadRequestException({ code: problem, message: problem });
  const startsAt = new Date(v.startsAt).toISOString();
  return { startsAt, plannedEndAt: plannedEnd(startsAt, v.durationMin ?? DEFAULT_MEETING_DURATION) };
}

/**
 * PATCH /meetings/:id: the new times from what is sent and what the meeting has. A new start keeps
 * the current length unless a duration is sent; a duration alone needs a scheduled meeting (400
 * not_scheduled). null = the times do not change.
 */
export function rescheduleTimes(
  current: { starts_at: string | null; planned_end_at: string | null },
  patch: { startsAt?: string | undefined; durationMin?: number | undefined },
  now: Date,
): ScheduleTimes | null {
  if (patch.startsAt === undefined && patch.durationMin === undefined) return null;
  const length = current.starts_at && current.planned_end_at ? (Date.parse(current.planned_end_at) - Date.parse(current.starts_at)) / MIN_MS : null;
  const startsAt = patch.startsAt ?? current.starts_at;
  if (!startsAt) throw new BadRequestException({ code: 'not_scheduled', message: 'not_scheduled' });
  return scheduleTimes({ startsAt, durationMin: patch.durationMin ?? length ?? undefined }, now);
}
