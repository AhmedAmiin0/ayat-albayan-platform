import type { OverviewTeacher, OverviewTimeOff, Span } from '@ab/schedule';
import { RIYADH_TZ, type ClockCycle } from '@ab/time';
import { teacherLoad } from '@/booking/trial/components/TeacherStep';
import { t, cityOf } from '@ab/mobile-kit';
import { formatTimeOff } from '@/more/schedule';
import { clockIn, isolated, rangeOf } from '@/core/lib/clock';

// R-SCH-01: teacher section wording on the viewer's clock; pure, tested in Arabic and English.

/** On the viewer's wall clock tz; an end on midnight reads 24:00 like the web's day track. */
export function spanClock(span: Span, cycle: ClockCycle, tz: string): { from: string; to: string } {
  const to = clockIn(new Date(span.ends_at), tz, cycle);
  return {
    from: clockIn(new Date(span.starts_at), tz, cycle),
    to: to === '00:00' ? '24:00' : to,
  };
}

/** The teacher's city is named only when not the academy's (docs/34: a place, not a clock). */
export function teacherMeta(teacher: OverviewTeacher): string {
  const programs = teacher.programs.map((p) => t.enums.program[p]).join(t.common.listSeparator);
  return [
    t.teachers.genderLabel[teacher.gender],
    programs,
    teacherLoad(teacher),
    ...(teacher.tz === RIYADH_TZ ? [] : [cityOf(teacher.tz)]),
  ]
    .filter(Boolean)
    .join(' · ');
}

/** On the viewer's clock tz, or null. */
export function windowsLine(
  windows: readonly Span[],
  cycle: ClockCycle,
  tz: string,
): string | null {
  if (windows.length === 0) return null;
  const ranges = windows.map((w) => {
    const { from, to } = spanClock(w, cycle, tz);
    return rangeOf(from, to, cycle);
  });
  return t.calendar.available
    .replace('{ranges}', ranges.join(t.common.listSeparator))
    .replace('{city}', cityOf(tz));
}

const RANGE = '{from} – {to}';

/** The whole range is one LTR island so Arabic never reverses it. */
export function freeLabel(span: Span, cycle: ClockCycle, tz: string): string {
  const { from, to } = spanClock(span, cycle, tz);
  if (t.schedule.free.includes(RANGE))
    return t.schedule.free.replace(RANGE, rangeOf(from, to, cycle));
  // A translation override that splits the range: each time its own island.
  return t.schedule.free.replace('{from}', isolated(from, cycle)).replace('{to}', isolated(to, cycle));
}

export function timeOffLine(off: OverviewTimeOff, cycle: ClockCycle): string {
  return [
    t.schedule.dayOff,
    formatTimeOff(off, cycle),
    ...(off.reason?.trim() ? [off.reason.trim()] : []),
  ].join(' · ');
}
