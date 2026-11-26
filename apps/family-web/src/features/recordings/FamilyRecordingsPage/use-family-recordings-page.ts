import { useLessonNav } from '@/features/recordings/use-lesson-nav';
import type { FamilyRecordingsPageProps } from './FamilyRecordingsPage.types';

export function useFamilyRecordingsPage({
  studentId,
}: Pick<FamilyRecordingsPageProps, 'studentId'>) {
  const nav = useLessonNav(studentId);
  return { nav };
}
