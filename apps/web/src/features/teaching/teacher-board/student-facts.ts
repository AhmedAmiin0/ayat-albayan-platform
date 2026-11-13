import { counted, PROGRAMS, TEACHER_STUDENT_KINDS, type TeacherStudentKind } from '@ab/shared';
import { useQueries, type UseQueryResult } from '@tanstack/react-query';
import { z } from 'zod';
import { apiFetch } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';

// docs/48 web-students: «القرآن الكريم · جزء عمّ · 9 سنوات» under each name on the board, joined
// by id from GET /teachers/me/students?kind= (no API change; TeacherMe is not widened).

const factsSchema = z.array(
  z.object({
    id: z.string(),
    program: z.enum(PROGRAMS),
    level: z.string().nullable(),
    age: z.number().nullable(),
  }),
);
export type StudentFacts = z.infer<typeof factsSchema>[number];

/** The facts of a student keyed by id (a missing id: no line). */
export type FactsById = ReadonlyMap<string, string>;

/** Facts rarely change and each call scans 60 days: 5 min fresh, never polled (docs/48). */
const FACTS_STALE_MS = 300_000;

/** program · level · age (plural), nulls dropped, never «—». */
export function factsLine(s: Omit<StudentFacts, 'id'>): string {
  const age = s.age === null ? null : counted(t.teacherStudents.ageYears, s.age);
  return [t.enums.program[s.program], s.level, age].filter(Boolean).join(' · ');
}

export const studentFactsQuery = (kind: TeacherStudentKind) => ({
  queryKey: ['teachers', 'me', 'students', kind] as const,
  queryFn: async () => factsSchema.parse(await apiFetch(`/teachers/me/students?kind=${kind}`)),
  staleTime: FACTS_STALE_MS,
});

/** Module-level (a stable reference): the Map is rebuilt only when the results change. */
function combineFacts(results: UseQueryResult<StudentFacts[]>[]): FactsById {
  const pairs = results.flatMap((r) => r.data ?? []).map((s) => [s.id, factsLine(s)] as const);
  return new Map(pairs);
}

/** Both kinds' facts in one Map; a failed kind only drops its own lines. */
export function useStudentFacts(): FactsById {
  const queries = TEACHER_STUDENT_KINDS.map(studentFactsQuery);
  return useQueries({ queries, combine: combineFacts });
}
