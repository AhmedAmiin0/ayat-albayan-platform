import type { StudentRecordingView } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { teacherLabel } from './recording-format';
import type { TeacherChoice } from './RecordingFiltersBar';

type Option = { id: string; display_name_ar: string; display_name_en?: string | null };

/** The teachers to filter by: every active teacher for the admin (GET /students/teacher-options), else those on the loaded rows. */
export function mergeChoices(rows: StudentRecordingView[], all: Option[]): TeacherChoice[] {
  const seen = new Map(all.map((x) => [x.id, teacherLabel(x)]));
  for (const r of rows) if (r.teacher) seen.set(r.teacher.id, teacherLabel(r.teacher));
  return [...seen].map(([id, name]) => ({ id, name }));
}

export function useTeacherChoices(rows: StudentRecordingView[], admin: boolean): TeacherChoice[] {
  const options = useQuery({
    queryKey: ['students', 'teacher-options'],
    queryFn: () => apiFetch<Option[]>('/students/teacher-options'),
    enabled: admin,
    staleTime: 10 * 60_000,
  });
  return mergeChoices(rows, options.data ?? []);
}
