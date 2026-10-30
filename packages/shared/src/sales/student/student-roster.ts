import { wallParts } from '../../schedule/lessons/index.js';
import { inWeekOrder } from '../course/course-picks.js';
import type { AttendanceKind } from './student-details.js';
import type { SalesWeeklySlot } from './student-schedule.js';

// «كل الطلاب» of the assistant (owner 2026-10-30: «Show all the students to the assistants with
// their schedule and attendance»): each row's weekly slots in one short line and an attendance
// count. Pure.

/** A row's weekly slot: the next start of each weekday (UTC) and the teacher; never a link. */
export type RosterSlot = Pick<SalesWeeklySlot, 'next' | 'teacher'>;

/** «حضر 7 من 9»: present lessons of the held ones (present + absent, as «سجل الحضور» counts). */
export interface RosterAttendance {
  attended: number;
  held: number;
  /** 'subscription': since the current package started; 'recent': the last 30 days. */
  basis: 'subscription' | 'recent';
}

/** Without a current package, the attendance of the last 30 days. */
export const ROSTER_RECENT_DAYS = 30;

/** Counts the student's past lessons (attendanceKind; null = a moved lesson, not its own day). */
export function rosterAttendance(
  kinds: readonly (AttendanceKind | null)[],
  basis: RosterAttendance['basis'],
): RosterAttendance {
  const attended = kinds.filter((k) => k === 'present').length;
  const absent = kinds.filter((k) => k === 'absent').length;
  return { attended, held: attended + absent, basis };
}

/** The days sharing one clock time and teacher, in the viewer's zone. */
export interface ScheduleGroup {
  days: number[];
  /** "HH:MM", 24 h, in the viewer's zone. */
  time: string;
  teacher: RosterSlot['teacher'];
}

const inOrder = (days: readonly number[]): number[] =>
  inWeekOrder(days.map((weekday) => ({ weekday }))).map((d) => d.weekday);

/** Each slot's starts read in `tz` (a day may cross midnight), grouped by time and teacher. */
export function scheduleGroups(slots: readonly RosterSlot[], tz: string): ScheduleGroup[] {
  const groups = new Map<string, ScheduleGroup>();
  for (const slot of slots) {
    for (const at of slot.next) {
      const w = wallParts(at, tz);
      const key = `${w.time}|${slot.teacher?.display_name_ar ?? ''}`;
      const group = groups.get(key) ?? { days: [], time: w.time, teacher: slot.teacher };
      if (!group.days.includes(w.weekday)) group.days.push(w.weekday);
      groups.set(key, group);
    }
  }
  const ordered = [...groups.values()].map((g) => ({ ...g, days: inOrder(g.days) }));
  const keyed = ordered.map((group) => ({ group, weekday: group.days[0] ?? 0 }));
  return inWeekOrder(keyed).map((g) => g.group);
}

/** The words of the line: each app passes its own i18n, clock cycle and teacher-name language. */
export interface ScheduleWords {
  weekday: (day: number) => string;
  clock: (hhmm: string) => string;
  teacher: (teacher: NonNullable<RosterSlot['teacher']>) => string;
  /** Between the days of one group («، »). */
  daySep: string;
  /** Between two groups («؛ »). */
  groupSep: string;
}

/** «الأحد، الثلاثاء، الخميس · 11:00 ص · أسماء حسين»; null without a weekly slot. */
export function scheduleLine(
  slots: readonly RosterSlot[],
  tz: string,
  words: ScheduleWords,
): string | null {
  const groups = scheduleGroups(slots, tz);
  if (groups.length === 0) return null;
  return groups
    .map((g) => {
      const parts = [g.days.map(words.weekday).join(words.daySep), words.clock(g.time)];
      if (g.teacher) parts.push(words.teacher(g.teacher));
      return parts.join(' · ');
    })
    .join(words.groupSep);
}
