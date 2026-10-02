import type { LeadStatus } from '../enums/index.js';
import { utcOffsetMinutes } from '../time-zone.js';

// When reminders and follow-ups go out (docs/12 §7). Pure: the jobs call these on every tick and
// the dedup keys make a repeated tick a no-op (rule 8).

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** R-LEAD-05: only these leads get follow-ups. */
export const FOLLOW_UP_STATUSES = ['interested_no_slot', 'no_reply'] as const satisfies readonly LeadStatus[];

export interface FollowUpLead {
  status: LeadStatus;
  follow_up_paused: boolean;
  /** Follow-ups already sent: index into settings.follow_up_hours. */
  follow_up_stage: number;
  last_inbound_at: string | null;
  created_at: string;
}

/**
 * Due time of the lead's next follow-up: follow_up_hours[stage] after their last message (24 h,
 * then 72 h by default), or null when paused, not in a follow-up status, or all were sent.
 * A new inbound message resets follow_up_stage to 0 (the lead answered).
 */
export function nextFollowUpAt(lead: FollowUpLead, hours: readonly number[]): Date | null {
  if (lead.follow_up_paused) return null;
  if (!(FOLLOW_UP_STATUSES as readonly string[]).includes(lead.status)) return null;
  const h = hours[lead.follow_up_stage];
  if (h === undefined) return null;
  return new Date(Date.parse(lead.last_inbound_at ?? lead.created_at) + h * HOUR);
}

const localDates = new Map<string, Intl.DateTimeFormat>();

/** «YYYY-MM-DD» of `at` in `tz`. */
function localDate(at: Date, tz: string): string {
  let f = localDates.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' });
    localDates.set(tz, f);
  }
  return f.format(at);
}

/**
 * The day-before reminder goes out at the lesson's wall-clock time on the previous local day in
 * the recipient's tz (so «بكرة» is always true): 24 h, or 23 / 25 h across a DST change.
 */
export function dayBeforeSendAt(startsAt: Date, tz: string): Date {
  const naive = new Date(startsAt.getTime() - DAY);
  const shift = utcOffsetMinutes(tz, startsAt) - utcOffsetMinutes(tz, naive);
  return new Date(naive.getTime() + shift * MINUTE);
}

export type ReminderKind = 'day_before' | 'same_day';

export interface ReminderTiming {
  kind: ReminderKind;
  startsAt: Date;
  /** The recipient's tz (guardian, or the teacher for teacher reminders). */
  tz: string;
  /** settings.reminder_minutes_before (same_day). */
  minutesBefore: number;
  now: Date;
}

/**
 * Should a tick at `now` queue this reminder? same_day: from minutesBefore before the start until
 * the start. day_before: from dayBeforeSendAt while the lesson is still «بكرة» in the recipient's
 * tz, so a lesson booked for later today never gets a «بكرة» message.
 */
export function reminderDue(t: ReminderTiming): boolean {
  const now = t.now.getTime();
  const start = t.startsAt.getTime();
  if (now >= start) return false;
  if (t.kind === 'same_day') return now >= start - t.minutesBefore * MINUTE;
  if (now < dayBeforeSendAt(t.startsAt, t.tz).getTime()) return false;
  const tomorrow = new Date(`${localDate(t.now, t.tz)}T12:00:00Z`);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  return localDate(t.startsAt, t.tz) === tomorrow.toISOString().slice(0, 10);
}
