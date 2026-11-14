import { useQuery } from '@tanstack/react-query';
import { apiFetch, pathKey } from '@ab/mobile-kit';

/** The student's name from GET /students/:id (the quick-view's cache), only when `enabled`. */
export function useStudentName(id: string, enabled: boolean): string | undefined {
  const path = `/students/${id}`;
  const q = useQuery({
    queryKey: pathKey(path),
    queryFn: () => apiFetch<{ name: string }>(path),
    enabled,
  });
  return q.data?.name;
}
