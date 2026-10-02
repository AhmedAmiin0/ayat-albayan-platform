import { clockTime, RIYADH_TZ } from '@ab/shared';
import { teacherLoad } from '@/booking/TeacherStep';
import { cityOf } from '@/booking/slots';
import { t } from '@/lib/i18n';
import { formatTimeOff } from '@/more/schedule';
import { ltr } from '@/ui/Ltr';
import type { OverviewTeacher, OverviewTimeOff, Span } from './overview-types';

// The words of a «الجدول» teacher section (R-SCH-01): who the teacher is, their load, the day's
// windows and free gaps on the Riyadh clock, and time off. Pure, unit-tested in Arabic and English.

/** «20:00 – 24:00»: Riyadh wall clock; an end on midnight reads 24:00, like the web's day track. */
export function spanClock(span: Span): { from: string; to: string } {
  const to = clockTime(new Date(span.ends_at), RIYADH_TZ);
  return {
    from: clockTime(new Date(span.starts_at), RIYADH_TZ),
    to: to === '00:00' ? '24:00' : to,
  };
}

/** «معلمة · تحفيظ وتجويد، لغة عربية · 3 من 10 طالب · القاهرة» (the city only when not Riyadh). */
export function teacherMeta(teacher: OverviewTeacher): string {
  const programs = teacher.programs.map((p) => t.enums.program[p]).join(t.teachers.listSeparator);
  return [
    t.teachers.genderLabel[teacher.gender],
    programs,
    teacherLoad(teacher),
    ...(teacher.tz === RIYADH_TZ ? [] : [cityOf(teacher.tz)]),
  ]
    .filter(Boolean)
    .join(' · ');
}

/** «متاح 16:00 – 18:00، 20:00 – 22:00 بتوقيت الرياض», or null without windows. */
export function windowsLine(windows: readonly Span[]): string | null {
  if (windows.length === 0) return null;
  const ranges = windows.map((w) => {
    const { from, to } = spanClock(w);
    return ltr(`${from} – ${to}`);
  });
  return t.calendar.available
    .replace('{ranges}', ranges.join(t.common.listJoiner))
    .replace('{city}', t.runningHead.riyadh);
}

/** «فاضي 17:00 – 19:00». */
export function freeLabel(span: Span): string {
  const { from, to } = spanClock(span);
  return t.schedule.free.replace('{from}', ltr(from)).replace('{to}', ltr(to));
}

/** «إجازة · الخميس 1 أكتوبر · سفر». */
export function timeOffLine(off: OverviewTimeOff): string {
  return [
    t.schedule.dayOff,
    formatTimeOff(off),
    ...(off.reason?.trim() ? [off.reason.trim()] : []),
  ].join(' · ');
}
