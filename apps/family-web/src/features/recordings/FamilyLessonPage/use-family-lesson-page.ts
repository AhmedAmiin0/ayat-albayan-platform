import { useLessonNav } from '@/features/recordings/use-lesson-nav';
import type { Props } from './FamilyLessonPage.types';

export function useFamilyLessonPage({ studentId }: Pick<Props, 'studentId'>) {
  const nav = useLessonNav(studentId);
  return { nav };
}
