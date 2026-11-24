import { recordingMinutes } from '@ab/client-core';
import {
  clockOf, counted, dateText, teacherName, type ClockOptions, type PortalLessonAssets,
  type PortalRecording,
} from '@ab/shared';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { locale } from '@ab/web-kit/lib/i18n/locale';

const F = t.lessonFiles;

export const lessonTitle = (startsAt: string, clock: ClockOptions): string =>
  F.lessonOf.replace(
    '{when}',
    dateText(new Date(startsAt), clock, { weekday: 'long', day: 'numeric', month: 'long' }),
  );

/** null without a teacher. */
const withTeacher = (teacher: PortalRecording['teacher']): string | null =>
  teacher && t.portal.withTeacher.replace('{teacher}', teacherName(teacher, locale));

export function lessonLine(
  view: Pick<PortalLessonAssets, 'lesson_starts_at' | 'lesson_ends_at' | 'teacher'>,
  input: { name: string; clock: ClockOptions },
): string {
  const at = (iso: string) => clockOf(new Date(iso), input.clock);
  const range = `${at(view.lesson_starts_at)} – ${at(view.lesson_ends_at)}`;
  return [input.name, withTeacher(view.teacher), range].filter(Boolean).join(' · ');
}

export function rowLine(
  row: PortalRecording,
  input: { parts: number; clock: ClockOptions },
): string {
  const minutes = t.portal.app.lesson.minutes.replace('{n}', recordingMinutes(row.duration_seconds));
  return [
    withTeacher(row.teacher),
    clockOf(new Date(row.lesson_starts_at), input.clock),
    minutes,
    input.parts > 1 ? counted(F.partsCount, input.parts) : null,
  ].filter(Boolean).join(' · ');
}
