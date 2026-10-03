import { lessonDuration } from '@ab/shared';
import type { LessonTimeEdit, TimeEditMode } from './edit-time.contract';
import { addDays, zonedParts, zonedToUtc } from './tz';

// «عدّل الوقت» form logic (R-SCH-11): picked days and times, never typed. Pure, unit-tested.

const STEP = 15;
const MIN = 60_000;
const hhmm = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

/** Time select options in 15-minute steps; an off-grid current value (16:10) is kept. */
export function timeOptions15(current?: string): string[] {
  const all = Array.from({ length: 1440 / STEP }, (_, i) => hhmm(i * STEP));
  return !current || all.includes(current) ? all : [...all, current].sort();
}

/** Move mode's day chips: today and the next six days on the teacher's calendar. */
export function moveDays(now: Date, tz: string): string[] {
  const today = zonedParts(now, tz).date;
  return Array.from({ length: 7 }, (_, i) => addDays(today, i));
}

/** The picked wall clock, in the teacher's zone `tz`. */
export interface TimeChoice {
  date: string;
  time: string;
  durationMin: number;
  tz: string;
}

const startOf = (c: TimeChoice) => zonedToUtc(c.date, c.time, c.tz);
const endOf = (c: TimeChoice) => new Date(startOf(c).getTime() + c.durationMin * MIN);

/** The instant picked, UTC ISO (what the API stores). */
export const startsAtOf = (c: TimeChoice): string => startOf(c).toISOString();

export interface DayRule {
  now: Date;
  /** Correct mode: each person's zone with the day the lesson was on there; the new start stays on it. */
  sameDay?: readonly { tz: string; date: string }[];
}

/**
 * Start times offered for `c.date`. Move: later than now. Correct: the lesson already happened, so
 * its end is at or before now, and the start stays on the lesson's day for the teacher and every
 * student (no cross-midnight corrections). `c.time` always stays in the list (the select's value).
 */
export function timesFor(mode: TimeEditMode, c: TimeChoice, rule: DayRule): string[] {
  const ok = (time: string) => {
    const at = { ...c, time };
    if (mode === 'move') return startOf(at) > rule.now;
    const start = startOf(at);
    const sameDay = (rule.sameDay ?? []).every((z) => zonedParts(start, z.tz).date === z.date);
    return endOf(at) <= rule.now && sameDay;
  };
  return timeOptions15(c.time).filter((time) => time === c.time || ok(time));
}

export interface Change {
  start: boolean;
  duration: boolean;
}

/** What differs from the lesson as stored (instants and minutes, not the clock text). */
export function changeOf(old: { startsAt: string; durationMin: number }, c: TimeChoice): Change {
  return { start: startsAtOf(c) !== new Date(old.startsAt).toISOString(), duration: c.durationMin !== old.durationMin };
}

/**
 * Whether «ابعت تأكيد الميعاد الجديد» applies: only a move to a later start in the future (a length
 * change alone says nothing the WhatsApp text shows). The API queues it unless `notify: false`.
 */
export function willNotify(mode: TimeEditMode, change: Change, c: TimeChoice & { now: Date }): boolean {
  return mode === 'move' && change.start && startOf(c) > c.now;
}

export interface BodyInput {
  mode: TimeEditMode;
  /** The start and end the admin saw: a second admin's length-only edit is refused, not overwritten. */
  expectedStartsAt: string;
  expectedEndsAt: string;
  choice: TimeChoice;
  reason: string;
  notify: boolean;
  override?: string | undefined;
}

/** True for the lengths the API takes (30/45/60/90); a migrated odd length must be changed first. */
export const validLength = (min: number): boolean => lessonDuration.safeParse(min).success;

/** PATCH /lessons/:id/time body: `notify` only when moving; blank reason left out. */
export function editBody(i: BodyInput): LessonTimeEdit {
  const reason = i.reason.trim();
  return {
    expectedStartsAt: i.expectedStartsAt,
    expectedEndsAt: i.expectedEndsAt,
    startsAt: startsAtOf(i.choice),
    durationMin: lessonDuration.parse(i.choice.durationMin),
    ...(reason ? { reason } : {}),
    ...(i.mode === 'move' ? { notify: i.notify } : {}),
    ...(i.override ? { override: { reason: i.override } } : {}),
  };
}
