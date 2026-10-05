import { useQuery } from '@tanstack/react-query';
import { studentRecordingsQuery } from '@/features/students/recordings-api';

const MOST_RECENT = 100;

/**
 * The lessons of this student that have a finished recording (the newest 100), so the report
 * history links only to recordings that exist. A refused or failed request means no links.
 */
export function useRecordedLessons(studentId: string): ReadonlySet<string> {
  const { data } = useQuery(studentRecordingsQuery({ studentId, filters: {}, page: 1, pageSize: MOST_RECENT }));
  const items = Array.isArray(data?.items) ? data.items : [];
  return new Set(items.filter((r) => r.status === 'done').map((r) => r.lesson_id));
}
