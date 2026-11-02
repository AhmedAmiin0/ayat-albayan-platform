import {
  type CreateMeeting,
  DEFAULT_MEETING_DURATION,
  MEETING_DURATION_MAX,
  MEETING_DURATION_MIN,
  MEETING_MAX_AHEAD_DAYS,
  scheduleProblem,
  wallInstant,
  zonedPartsIn,
} from '@ab/shared';
import type { PickedInvitee } from '@/features/teaching/meetings/invitees/invitee-list';

// «اجتماع مجدول» (R-MEET-01): a date + a 15-minute time select on the viewer's own clock (rule 6:
// never free text), turned into a UTC ISO startsAt with wallInstant. Pure, unit-tested.

export interface ScheduleValue {
  /** Local day, "YYYY-MM-DD". */
  date: string;
  /** Local wall clock, "HH:MM". */
  time: string;
  durationMin: number;
}

const STEP_MIN = 15;
const pad = (n: number) => String(n).padStart(2, '0');

/** "00:00" … "23:45" in 15-minute steps; an off-grid `current` (an old meeting) is kept. */
export function quarterTimes(current = ''): string[] {
  const all = Array.from({ length: (24 * 60) / STEP_MIN }, (_, i) => `${pad(Math.floor((i * STEP_MIN) / 60))}:${pad((i * STEP_MIN) % 60)}`);
  return !current || all.includes(current) ? all : [...all, current].sort();
}

/** 15, 30, … 240 minutes. */
export const DURATION_OPTIONS: readonly number[] = Array.from(
  { length: (MEETING_DURATION_MAX - MEETING_DURATION_MIN) / STEP_MIN + 1 },
  (_, i) => MEETING_DURATION_MIN + i * STEP_MIN,
);

/** The first quarter hour at least 15 minutes from now, on the viewer's clock; 60 minutes. */
export function defaultSchedule(now: Date, tz: string): ScheduleValue {
  const step = STEP_MIN * 60_000;
  const next = new Date(Math.ceil((now.getTime() + step) / step) * step);
  const { date, time } = zonedPartsIn(next, tz);
  return { date, time, durationMin: DEFAULT_MEETING_DURATION };
}

/** A stored meeting's start and planned end, back on the viewer's clock (the reschedule form). */
export function scheduleOf(m: { starts_at: string; planned_end_at: string | null }, tz: string): ScheduleValue {
  const { date, time } = zonedPartsIn(new Date(m.starts_at), tz);
  const minutes = m.planned_end_at ? Math.round((Date.parse(m.planned_end_at) - Date.parse(m.starts_at)) / 60_000) : DEFAULT_MEETING_DURATION;
  const durationMin = Math.min(MEETING_DURATION_MAX, Math.max(MEETING_DURATION_MIN, minutes));
  return { date, time, durationMin };
}

/** The UTC instant of the picked wall clock in `tz`, as ISO. */
export const startsAtOf = (v: Pick<ScheduleValue, 'date' | 'time'>, tz: string): string => wallInstant(v.date, v.time, tz).toISOString();

/** The client-side check before sending (the API checks again): past or more than 90 days ahead. */
export function scheduleIssue(v: ScheduleValue, ctx: { now: Date; tz: string }): 'starts_in_past' | 'too_far_ahead' | null {
  if (!v.date || !v.time) return 'starts_in_past';
  return scheduleProblem(startsAtOf(v, ctx.tz), ctx.now, MEETING_MAX_AHEAD_DAYS);
}

export interface CreateBodyInput {
  title: string;
  invitees: readonly PickedInvitee[];
  clientRequestId: string;
  /** Absent = an instant meeting. */
  schedule?: { value: ScheduleValue; tz: string };
}

/** POST /meetings body: only what was given (no empty title, no empty invitees). */
export function createBody(i: CreateBodyInput): CreateMeeting {
  const title = i.title.trim();
  return {
    ...(title && { title }),
    ...(i.schedule && { startsAt: startsAtOf(i.schedule.value, i.schedule.tz), durationMin: i.schedule.value.durationMin }),
    ...(i.invitees.length > 0 && { invitees: i.invitees.map((p) => p.input) }),
    clientRequestId: i.clientRequestId,
  };
}
