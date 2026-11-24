import { counted } from '@ab/core';
import { teacherName } from '@ab/schedule';
import type { ClockCycle } from '@ab/time';
import { t, locale } from '@ab/mobile-kit';
import { durationLabel, studentTimes } from '@/today/lib/lesson-text';
import type { TodayLesson } from '@/today/lib/today-lesson';
import type { Hero } from '@/today/lib/today-plan';

/** Shows the countdown only under an hour. */
export function heroLead(hero: Hero): string {
  if (hero.kind === 'running') return t.today.running;
  return hero.minutes < 60 ? `${t.today.next} · ${counted(t.today.inMinutes, hero.minutes)}` : t.today.next;
}

export function heroSubtitle(lesson: TodayLesson, cycle: ClockCycle, tz: string): string {
  const teacher = t.today.withTeacher.replace(
    '{teacher}',
    t.today.teacherTitled.replace('{teacher}', teacherName(lesson.teacher, locale)),
  );
  return [teacher, durationLabel(lesson), ...studentTimes(lesson, cycle, tz)]
    .filter((part): part is string => part !== undefined)
    .join(' · ');
}
