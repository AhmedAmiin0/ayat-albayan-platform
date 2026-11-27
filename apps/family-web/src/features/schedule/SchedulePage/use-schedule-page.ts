import { portalViewer, readsOwn } from '@ab/client-core';
import { useWeek } from '@/features/schedule/use-week';
import type { SchedulePageProps } from './SchedulePage.types';

export function useSchedulePage({ student, kind }: Pick<SchedulePageProps, 'student' | 'kind'>) {
  const week = useWeek(student);
  const own = readsOwn(portalViewer(kind, student));
  const guardian = kind === 'guardian' && !own;
  return { week, own, guardian };
}
