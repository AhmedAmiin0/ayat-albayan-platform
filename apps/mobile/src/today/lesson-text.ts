import { clockTime, RIYADH_TZ, type LessonView } from '@ab/shared';
import { t } from '@/lib/i18n';
import { ltr } from '@/ui/Ltr';

// Card lines for a lesson (R-SCH-01: Riyadh time on the spine, the student's own clock beside it
// when it differs). Western digits, 24h, wall-clock from the UTC instants the API returns.

const MINUTE = 60_000;
const durations: Record<string, string | undefined> = t.enums.duration;
const cities: Record<string, string | undefined> = t.tz;

/** «16:00»: the lesson start in Riyadh, the screen's clock (docs/07 §12 date line). */
export function riyadhTime(iso: string): string {
  return clockTime(new Date(iso), RIYADH_TZ);
}

/** «45 دقيقة» from the lesson's own span; nothing for a length outside the duration enum. */
export function durationLabel(lesson: LessonView): string | undefined {
  const min = Math.round((Date.parse(lesson.ends_at) - Date.parse(lesson.starts_at)) / MINUTE);
  return durations[String(min)];
}

/** «18:00 بتوقيت مسقط» once per student zone that is not Riyadh's; an unlabelled zone shows its id. */
export function studentTimes(lesson: LessonView): string[] {
  const zones = [...new Set(lesson.students.map((s) => s.tz))].filter((tz) => tz !== RIYADH_TZ);
  const start = new Date(lesson.starts_at);
  return zones.map((tz) =>
    t.today.studentTime.replace('{time}', clockTime(start, tz)).replace('{city}', cities[tz] ?? ltr(tz)),
  );
}

/** «مع أبرار · 45 دقيقة · 18:00 بتوقيت مسقط». */
export function lessonSubtitle(lesson: LessonView): string {
  const teacher = t.today.withTeacher.replace('{teacher}', lesson.teacher.display_name_ar);
  return [teacher, durationLabel(lesson), ...studentTimes(lesson)]
    .filter((part): part is string => part !== undefined)
    .join(' · ');
}

/** «جودى خالد، يوسف أحمد» for the compact past row. */
export function studentNames(lesson: LessonView): string {
  return lesson.students.map((s) => s.name).join(t.common.listJoiner);
}
