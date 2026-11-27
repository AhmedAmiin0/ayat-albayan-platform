import { useJoin } from '@/lessons/use-join';
import type { JoinNowProps } from './JoinNow.types';

export function useJoinNow({ lesson, studentId }: Pick<JoinNowProps, 'lesson' | 'studentId'>) {
  const join = useJoin(studentId);
  return { busy: join.isPending, failed: join.isError, onJoin: () => join.mutate(lesson) };
}
