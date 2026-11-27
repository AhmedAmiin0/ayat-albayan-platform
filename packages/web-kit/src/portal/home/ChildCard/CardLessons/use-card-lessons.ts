import { nextLesson, PORTAL_REFRESH_MS } from '@ab/client-core';
import { useNow } from '@ab/web-kit/lib/time/use-now';
import type { CardLessonsProps } from './CardLessons.types';

export function useCardLessons({ lessons }: Pick<CardLessonsProps, 'lessons'>) {
  const next = nextLesson(lessons.lessons, useNow(PORTAL_REFRESH_MS));
  return { next };
}
