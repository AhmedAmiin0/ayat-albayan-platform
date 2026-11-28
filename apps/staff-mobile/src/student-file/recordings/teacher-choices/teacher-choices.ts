import type { StudentRecordingView } from '@ab/schedule';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { studentCalls } from '@ab/client-core';
import type { TeacherOptionView } from '@ab/shared';
import { apiFetch, apiSend } from '@ab/mobile-kit';
import { studentKeys } from '@/core/lib/keys';
import { teacherLabel } from '@/student-file/recordings/recording-format';
import type { TeacherChoice } from '@/student-file/recordings/RecordingFiltersBar';

type Option = Pick<TeacherOptionView, 'id' | 'display_name_ar'> & {
  display_name_en?: string | null;
};

const students = studentCalls({ apiFetch, apiSend });

/**
 * The teachers to filter by: every active teacher for the admin
 * (GET /students/teacher-options), else those on the loaded rows.
 */
export function mergeChoices(rows: StudentRecordingView[], all: Option[]): TeacherChoice[] {
  const seen = new Map(all.map((x) => [x.id, teacherLabel(x)]));
  for (const r of rows) if (r.teacher) seen.set(r.teacher.id, teacherLabel(r.teacher));
  return [...seen].map(([id, name]) => ({ id, name }));
}

/** `a` then whatever `b` adds; the same list back when `b` adds nothing (no state churn). */
function unionChoices(a: TeacherChoice[], b: TeacherChoice[]): TeacherChoice[] {
  const extra = b.filter((c) => !a.some((x) => x.id === c.id));
  return extra.length ? [...a, ...extra] : a;
}

export function useTeacherChoices(rows: StudentRecordingView[], admin: boolean): TeacherChoice[] {
  const options = useQuery({
    queryKey: studentKeys.teacherOptions(),
    queryFn: () => students.teacherOptions(),
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
