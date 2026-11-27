import { isAhead } from '@ab/client-core';
import { useFamilyClock } from '@/portal';
import type { UpcomingListProps } from './UpcomingList.types';

export function useUpcomingList({
  lessons,
  student,
  now,
}: Pick<UpcomingListProps, 'lessons' | 'student' | 'now'>) {
  const clock = { ...useFamilyClock(), tz: student.tz };
  const later = lessons.filter((l) => isAhead(l, now)).slice(1);
  return { clock, later };
}
