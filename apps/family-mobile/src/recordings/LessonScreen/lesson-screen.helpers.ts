import type { PortalLessonAssets } from '@ab/shared';
import type { ClockOptions } from '@ab/time';
import { t } from '@ab/mobile-kit';
import { dateLine, rangeText } from '@/lessons';

type Lesson = Pick<PortalLessonAssets, 'lesson_starts_at' | 'lesson_ends_at'>;
interface Heading {
  title: string;
  subtitle: string | undefined;
}

const loading: Heading = { title: t.lessonFiles.lessonPage, subtitle: undefined };

/** The lesson's day as the title; the child's name and the lesson's hours under it. */
export function lessonHeading(input: {
  lesson: Lesson | undefined;
  name: string | undefined;
  clock: ClockOptions;
}): Heading {
  const { lesson, name, clock } = input;
  if (!lesson) return loading;
  const when = { starts_at: lesson.lesson_starts_at, ends_at: lesson.lesson_ends_at };
  const day = dateLine(new Date(lesson.lesson_starts_at), clock);
  return {
    title: t.lessonFiles.lessonOf.replace('{when}', day),
    subtitle: [name, rangeText(when, clock)].filter(Boolean).join(' · '),
  };
}
