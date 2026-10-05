import { useQuery } from '@tanstack/react-query';
import { recordedLessonIdsQuery } from '@/features/students/recordings-api';

/**
 * The lessons of this student that have a finished recording, so the report history links only
 * to recordings that exist. Ids only (nothing is signed). A refused or failed request means no links.
 */
export function useRecordedLessons(studentId: string): ReadonlySet<string> {
  const { data } = useQuery(recordedLessonIdsQuery(studentId));
  return new Set(Array.isArray(data) ? data : []);
}
