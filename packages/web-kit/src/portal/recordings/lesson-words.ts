import { recordingMinutes } from '@ab/client-core';
import {
  clockOf, counted, dateText, teacherName, type ClockOptions, type PortalLessonAssets,
  type PortalRecording,
} from '@ab/shared';
import { t, locale } from '#/lib/i18n/index.ts';

const F = t.lessonFiles;

/** «حلقة الأحد 15 نوفمبر». */
export const lessonTitle = (startsAt: string, clock: ClockOptions): string =>
  F.lessonOf.replace(
    '{when}',
    dateText(new Date(startsAt), clock, { weekday: 'long', day: 'numeric', month: 'long' }),
  );

/** «مع مريم عبد الله»; null without a teacher. */
const withTeacher = (teacher: PortalRecording['teacher']): string | null =>
  teacher && t.portal.withTeacher.replace('{teacher}', teacherName(teacher, locale));

/** «سلمى أحمد · مع مريم عبد الله · 17:00 – 17:45» under the lesson page's title. */
export function lessonLine(
  view: Pick<PortalLessonAssets, 'lesson_starts_at' | 'lesson_ends_at' | 'teacher'>,
  input: { name: string; clock: ClockOptions },
): string {
  const at = (iso: string) => clockOf(new Date(iso), input.clock);
  const range = `${at(view.lesson_starts_at)} – ${at(view.lesson_ends_at)}`;
  return [input.name, withTeacher(view.teacher), range].filter(Boolean).join(' · ');
}

/** «مع مريم عبد الله · 17:00 · 44 دقيقة · جزءان» of one lesson's row. */
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
