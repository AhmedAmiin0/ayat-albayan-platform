import { useChildLessons } from '@/portal';

export function useUpcomingPanel(studentId: string) {
  const lessons = useChildLessons(studentId);
  return { lessons };
}
