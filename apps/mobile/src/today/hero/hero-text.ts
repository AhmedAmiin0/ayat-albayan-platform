import { counted, teacherName, type ClockCycle } from '@ab/shared';
import { t } from '@/core/lib/i18n/i18n';
import { locale } from '@/core/lib/i18n/locale';
import { durationLabel, studentTimes } from '../lib/lesson-text';
import type { TodayLesson } from '../lib/today-lesson';
import type { Hero } from '../lib/today-plan';

/** «الحلقة التالية · بعد 12 دقيقة» under an hour, «الحلقة التالية» later on, «جارية الآن» when under way. */
export function heroLead(hero: Hero): string {
  if (hero.kind === 'running') return t.today.running;
  return hero.minutes < 60 ? `${t.today.next} · ${counted(t.today.inMinutes, hero.minutes)}` : t.today.next;
}

/** «مع أ. هدى · 45 دقيقة · 18:00 بتوقيت مسقط». */
export function heroSubtitle(lesson: TodayLesson, cycle: ClockCycle): string {
  const teacher = t.today.withTeacher.replace(
    '{teacher}',
    t.today.teacherTitled.replace('{teacher}', teacherName(lesson.teacher, locale)),
  );
  return [teacher, durationLabel(lesson), ...studentTimes(lesson, cycle)]
    .filter((part): part is string => part !== undefined)
    .join(' · ');
}
