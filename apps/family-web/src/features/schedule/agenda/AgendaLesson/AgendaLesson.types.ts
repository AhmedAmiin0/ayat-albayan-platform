import type { WeekLesson } from '@ab/client-core';

export interface AgendaLessonProps {
  entry: WeekLesson;
  /** Only a guardian answers for the lesson; a student only reads it. */
  guardian: boolean;
}
