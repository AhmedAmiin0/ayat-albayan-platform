import { otherZoneClock, type ClockCycle, type LessonView } from '@ab/shared';
import { t } from '@/core/lib/i18n/i18n';
import { locale } from '@/core/lib/i18n/locale';
import { durationLabel, studentTimes } from '@/today';

// The teacher's lesson lines (docs/48): her row's «عند الطالب 15:00» and the hero's subtitle. The
// zone is her own (docs/07 principle 7), so no «بتوقيتك» anywhere. Pure.

interface Clock {
  tz: string;
  cycle: ClockCycle;
}

/** «عند الطالب 15:00» once per student zone whose clock differs from hers at the start. */
export function studentClocks(lesson: LessonView, { tz, cycle }: Clock): string {
  const start = new Date(lesson.starts_at);
  return [...new Set(lesson.students.map((s) => s.tz))]
    .flatMap((zone) => {
      const time = otherZoneClock(start, zone, { tz, cycle, locale });
      return time === null ? [] : [t.teacherDash.studentTime.replace('{time}', time)];
    })
    .join(' · ');
}

/** «تجريبية · 45 دقيقة · 21:00 بتوقيت مسقط»: the hero's subtitle (no teacher: it is her). */
export function heroLine(lesson: LessonView, { tz, cycle }: Clock): string {
  const kinds = [
    lesson.trial ? t.schedule.trialTag : undefined,
    lesson.makeup ? t.booking.makeup.tag : undefined,
  ];
  return [...kinds, durationLabel(lesson), ...studentTimes(lesson, cycle, tz)]
    .filter((part): part is string => part !== undefined)
    .join(' · ');
}
