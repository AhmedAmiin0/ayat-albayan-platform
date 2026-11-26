import { myStudentsCall } from '@ab/client-core';
import {
  TEACHER_STUDENT_KINDS,
  type TeacherStudentKind,
  type TeacherStudentView,
} from '@ab/shared';
import { counted } from '@ab/core';
import { useQueries, type UseQueryResult } from '@tanstack/react-query';
import { teacherKeys } from '@/features/people/keys';
import { apiFetch, apiSend, t } from '@ab/web-kit';

// Facts joined by id from GET /teachers/me/students?kind= without widening TeacherMe (docs/48).

const myStudents = myStudentsCall({ apiFetch, apiSend });

/** The facts of a student keyed by id (a missing id: no line). */
export type FactsById = ReadonlyMap<string, string>;

/** Facts rarely change and each call scans 60 days: 5 min fresh, never polled (docs/48). */
const FACTS_STALE_MS = 300_000;

/** program · level · age (plural), nulls dropped, never «—». */
export function factsLine(s: Pick<TeacherStudentView, 'program' | 'level' | 'age'>): string {
  const age = s.age === null ? null : counted(t.teacherStudents.ageYears, s.age);
  return [t.enums.program[s.program], s.level, age].filter(Boolean).join(' · ');
}

export const studentFactsQuery = (kind: TeacherStudentKind) => ({
  queryKey: teacherKeys.myStudents(kind),
  queryFn: () => myStudents(kind),
  staleTime: FACTS_STALE_MS,
});

/** Module-level (a stable reference): the Map is rebuilt only when the results change. */
function combineFacts(results: UseQueryResult<TeacherStudentView[]>[]): FactsById {
  const pairs = results.flatMap((r) => r.data ?? []).map((s) => [s.id, factsLine(s)] as const);
  return new Map(pairs);
}

/** Both kinds' facts in one Map; a failed kind only drops its own lines. */
export function useStudentFacts(): FactsById {
  const queries = TEACHER_STUDENT_KINDS.map(studentFactsQuery);
  return useQueries({ queries, combine: combineFacts });
}
