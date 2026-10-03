import { dayMonthLabel, RIYADH_TZ, zonedParts } from '@/features/schedule/tz';
import { t } from '@/lib/i18n';

/** «الحلقة الجاية: 12 أكتوبر 17:00» on the academy's Riyadh clock, or «مفيش حلقة جاية». */
export function nextLessonText(startsAt: string | null): string {
  if (!startsAt) return t.teacherStudents.noNextLesson;
  const p = zonedParts(new Date(startsAt), RIYADH_TZ);
  return t.teacherStudents.nextLesson.replace('{when}', `${dayMonthLabel(p.date)} ${p.time}`);
}
