import { useQuery } from '@tanstack/react-query';
import { studentProfileQuery } from '@/students';

/** The student's name from GET /students/:id (the quick-view's cache), only when `enabled`. */
export function useStudentName(id: string, enabled: boolean): string | undefined {
  const q = useQuery({ ...studentProfileQuery(id), enabled });
  return q.data?.name;
}
