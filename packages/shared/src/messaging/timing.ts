import type { LeadStatus } from '../enums/index.js';
import { utcOffsetMinutes } from '../time-zone.js';

// When reminders and follow-ups go out (docs/12 §7). Pure: the jobs call these on every tick and
// the dedup keys make a repeated tick a no-op (rule 8).

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** R-LEAD-05: only these leads get follow-ups. */
export const FOLLOW_UP_STATUSES = ['interested_no_slot', 'no_reply'] as const satisfies readonly LeadStatus[];

/** leads.follow_up_note (migration 144): why a due follow-up has not gone out yet. */
export const FOLLOW_UP_NOTES = ['queued', 'waiting_template', 'no_slots'] as const;
export type FollowUpNote = (typeof FOLLOW_UP_NOTES)[number];

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
  return new Date(followUpCycle(lead) + h * HOUR);
}

/**
 * The follow-up cycle: the instant (epoch ms) the silence started, i.e. the lead's last message,
 * else when the lead was created. A new message starts a new cycle.
 */
export function followUpCycle(lead: Pick<FollowUpLead, 'last_inbound_at' | 'created_at'>): number {
  return Date.parse(lead.last_inbound_at ?? lead.created_at);
}

const FOLLOW_UP_PREFIX = 'follow_up_slots';

/**
 * dedup_key of a follow-up: `follow_up_slots:{lead}:{cycle}:{stage}`. The cycle keeps a later
 * silence (after the lead replied and the stage went back to 0) from colliding with an earlier one.
 */
export function followUpKey(input: { leadId: string; cycle: number; stage: number }): string {
  return `${FOLLOW_UP_PREFIX}:${input.leadId}:${input.cycle}:${input.stage}`;
}

/** The cycle inside a followUpKey, or null for any other key. */
export function followUpKeyCycle(key: string | null): number | null {
  const parts = key?.split(':') ?? [];
  if (parts.length !== 4 || parts[0] !== FOLLOW_UP_PREFIX) return null;
  const cycle = Number(parts[2]);
  return Number.isSafeInteger(cycle) ? cycle : null;
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

/**
 * Midnight that starts `at`'s local day in `tz`, as a UTC instant. The day-before reminder expires
 * then: sent any later (gate closed, retries) its «بكرة» would already be «النهاردة».
 */
export function localDayStart(at: Date, tz: string): Date {
  const naive = Date.parse(`${localDate(at, tz)}T00:00:00Z`);
  const guess = naive - utcOffsetMinutes(tz, new Date(naive)) * MINUTE;
  return new Date(naive - utcOffsetMinutes(tz, new Date(guess)) * MINUTE);
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
