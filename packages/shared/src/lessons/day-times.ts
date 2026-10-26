import { clockTime } from '../format/running-head.js';

// A weekly package where each picked weekday has its own time (owner 2026-10-18: «اختر موعدًا لكل
// يوم»). The DB keeps ONE schedule_rules row per distinct time (days sharing a time stay one rule,
// like the imported HEART timetables), so a booking is grouped by time. Pure, Intl only.

/** A weekday whose time differs from the booking's startTimeLocal (0 = الأحد … 6 = السبت). */
export interface DayTime {
  weekday: number;
  /** Wall clock "HH:MM" in the booking's tz. */
  startTimeLocal: string;
}
/** The weekdays sharing one start time: one schedule_rules row. */
export interface TimeGroup {
  startTimeLocal: string;
  byday: number[];
}
export interface DayTimesInput {
  byday: readonly number[];
  startTimeLocal: string;
  dayTimes?: readonly DayTime[] | undefined;
}

/** start time → its weekdays, in weekday order (tools/migrate heart.rules.ts slots()). */
export function timeGroups(input: DayTimesInput): TimeGroup[] {
  const out = new Map<string, number[]>();
  for (const day of [...input.byday].sort((a, b) => a - b)) {
    const time = input.dayTimes?.find((d) => d.weekday === day)?.startTimeLocal ?? input.startTimeLocal;
    out.set(time, [...(out.get(time) ?? []), day]);
  }
  return [...out].map(([startTimeLocal, byday]) => ({ startTimeLocal, byday }));
}

export interface WallParts {
  /** Local calendar day "YYYY-MM-DD". */
  date: string;
  /** "HH:MM", 24h. */
  time: string;
  /** 0 = الأحد … 6 = السبت. */
  weekday: number;
}

const DAY_MS = 86_400_000;
const dateFormats = new Map<string, Intl.DateTimeFormat>();
const utcOf = (date: string): number => Date.parse(`${date}T00:00:00Z`);

/** Local day, time and weekday of an instant in `tz`. */
export function wallParts(instant: string, tz: string): WallParts {
  let f = dateFormats.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' });
    dateFormats.set(tz, f);
  }
  const at = new Date(instant);
  const parts = f.formatToParts(at);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? '00';
  const date = `${get('year')}-${get('month')}-${get('day')}`;
  return { date, time: clockTime(at, tz), weekday: new Date(utcOf(date)).getUTCDay() };
}

/** Whole local days from a to b ("YYYY-MM-DD"). */
export const daysBetween = (a: string, b: string): number => Math.round((utcOf(b) - utcOf(a)) / DAY_MS);

export interface PickInput {
  /** The picked slots (UTC instants), one per weekday of the family's zone. */
  picks: readonly string[];
  /** The slot tapped now. */
  slot: string;
  /** The family's zone: weekdays and the 7-day window are counted there. */
  tz: string;
}

/**
 * The picks after tapping `slot`: the same slot again removes it; another slot on a picked weekday
 * replaces that day's; a slot 7 or more local days from a pick drops that pick (every pick is then
 * the first lesson of its weekday from the earliest one). Sorted by instant.
 */
export function togglePick({ picks, slot, tz }: PickInput): string[] {
  if (picks.includes(slot)) return picks.filter((p) => p !== slot);
  const at = wallParts(slot, tz);
  const kept = picks.filter((p) => {
    const w = wallParts(p, tz);
    return w.weekday !== at.weekday && Math.abs(daysBetween(w.date, at.date)) < 7;
  });
  return [...kept, slot].sort((a, b) => Date.parse(a) - Date.parse(b));
}

/** The booking body's rule fields from the picks (the earliest pick is startsAt / startsOn). */
export interface PickedRule {
  byday: number[];
  startTimeLocal: string;
  startsOn: string;
  startsAt: string;
  /** Only the days whose time differs from startTimeLocal; empty when all share it. */
  dayTimes: DayTime[];
}

export function dayTimesFromPicks(picks: readonly string[], tz: string): PickedRule | null {
  const sorted = [...picks].sort((a, b) => Date.parse(a) - Date.parse(b));
  const [first] = sorted;
  if (!first) return null;
  const head = wallParts(first, tz);
  const walls = sorted.map((p) => wallParts(p, tz));
  return {
    byday: walls.map((w) => w.weekday).sort((a, b) => a - b),
    startTimeLocal: head.time,
    startsOn: head.date,
    startsAt: first,
    dayTimes: walls
      .filter((w) => w.time !== head.time)
      .map((w) => ({ weekday: w.weekday, startTimeLocal: w.time }))
      .sort((a, b) => a.weekday - b.weekday),
  };
}

export interface CourseEndInput {
  groups: readonly TimeGroup[];
  /** The first lesson's local date. */
  startsOn: string;
  /** subscriptions.lessons_total: how many lessons the course has. */
  lessonsTotal: number;
}

/**
 * The local date of the N-th lesson (N = lessonsTotal) counted over every group from startsOn: the
 * rules' ends_on, so exactly N lessons are generated (owner 2026-10-18 decision 1). Local dates do
 * not move with DST. null when nothing can be counted.
 */
export function courseEndsOn({ groups, startsOn, lessonsTotal }: CourseEndInput): string | null {
  const days = new Set(groups.flatMap((g) => g.byday));
  if (days.size === 0 || lessonsTotal < 1) return null;
  let seen = 0;
  for (let day = utcOf(startsOn); ; day += DAY_MS) {
    const count = groups.filter((g) => g.byday.includes(new Date(day).getUTCDay())).length;
    seen += count;
    if (seen >= lessonsTotal) return new Date(day).toISOString().slice(0, 10);
  }
}
