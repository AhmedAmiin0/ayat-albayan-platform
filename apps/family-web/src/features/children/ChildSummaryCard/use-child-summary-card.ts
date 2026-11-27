import { useNextLesson } from '@/features/next-lesson';
import { useChildSummary } from '@/features/children/use-child-summary';
import type { ChildSummaryCardProps } from './ChildSummaryCard.types';

export function useChildSummaryCard({ student, kind }: Omit<ChildSummaryCardProps, 'onChoose'>) {
  const read = useChildSummary(student, kind);
  const lesson = useNextLesson(student.id);
  return { read, lesson };
}
