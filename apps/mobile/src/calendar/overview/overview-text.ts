import { RIYADH_TZ, type ClockCycle, type OverviewTeacher, type OverviewTimeOff, type Span } from '@ab/shared';
import { teacherLoad } from '@/booking/trial/components/TeacherStep';
import { cityOf } from '@/booking/shared/slots';
import { t } from '@/core/lib/i18n/i18n';
import { formatTimeOff } from '@/more/schedule';
import { clockIn, isolated, rangeOf } from '@/core/lib/clock';

// The words of a «الجدول» teacher section (R-SCH-01): who the teacher is, their load, the day's
// windows and free gaps on the viewer's clock, and time off. Pure, unit-tested in Arabic and
// English.

/**
 * «20:00 – 24:00»: the viewer's wall clock `tz`; an end on midnight reads 24:00 like the web's day
 * track (12 h: «12:00 ص», the end of the day).
 */
export function spanClock(span: Span, cycle: ClockCycle, tz: string): { from: string; to: string } {
  const to = clockIn(new Date(span.ends_at), tz, cycle);
  return {
    from: clockIn(new Date(span.starts_at), tz, cycle),
    to: to === '00:00' ? '24:00' : to,
  };
}

/**
 * «معلمة · القرآن الكريم، اللغة العربية · 3 من 10 طالب · القاهرة»: where the teacher lives, named
 * when not the academy's city (docs/34: a place, not a clock; kept).
 */
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

/** «متاح 16:00 – 18:00، 20:00 – 22:00 بتوقيت القاهرة» on the viewer's clock `tz`, or null. */
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

/** «فاضي 17:00 – 19:00»: the whole range one LTR island, so Arabic never reads it «19:00 – 17:00». */
export function freeLabel(span: Span, cycle: ClockCycle, tz: string): string {
  const { from, to } = spanClock(span, cycle, tz);
  if (t.schedule.free.includes(RANGE)) return t.schedule.free.replace(RANGE, rangeOf(from, to, cycle));
  // A translation override that splits the range: each time its own island.
  return t.schedule.free.replace('{from}', isolated(from, cycle)).replace('{to}', isolated(to, cycle));
}

/** «إجازة · الخميس 1 أكتوبر · سفر». */
export function timeOffLine(off: OverviewTimeOff, cycle: ClockCycle): string {
  return [
    t.schedule.dayOff,
    formatTimeOff(off, cycle),
    ...(off.reason?.trim() ? [off.reason.trim()] : []),
  ].join(' · ');
}
