import type { StudentRecordingView } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
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

/** `a` then whatever `b` adds; the same list back when `b` adds nothing (no state churn). */
export function unionChoices(a: TeacherChoice[], b: TeacherChoice[]): TeacherChoice[] {
  const extra = b.filter((c) => !a.some((x) => x.id === c.id));
  return extra.length ? [...a, ...extra] : a;
}

export function useTeacherChoices(rows: StudentRecordingView[], admin: boolean): TeacherChoice[] {
  const options = useQuery({
    queryKey: ['students', 'teacher-options'],
    queryFn: () => apiFetch<Option[]>('/students/teacher-options'),
    enabled: admin,
    staleTime: 10 * 60_000,
  });
  const current = useMemo(() => mergeChoices(rows, options.data ?? []), [rows, options.data]);
  // The server filters the rows: once one teacher is picked they hold only that teacher, so the
  // choices seen so far are remembered and the filter can be cleared again.
  const [seen, setSeen] = useState<TeacherChoice[]>([]);
  const next = unionChoices(seen, current);
  if (next !== seen) setSeen(next);
  return next;
}
