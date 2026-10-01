import { useQueries } from '@tanstack/react-query';
import type { AdminNavProps } from '@/components/AdminNav';
import { apiFetch } from '@/lib/api';
import { t } from '@/lib/i18n';

type Total = { total: number };

/** `total` of a paged list endpoint at pageSize=1. Keys sit under each feature's prefix, so the
 *  features' own invalidateQueries(['students']) etc. refresh the counts too. */
const countQuery = (prefix: string, path: string) => ({
  queryKey: [prefix, 'nav-count', path],
  queryFn: () => apiFetch<Total>(path),
  staleTime: 60_000,
  select: (p: Total) => p.total,
});

/**
 * Fihris counts from data the Phase 1 API really returns (docs/07 §7). New leads are the admin's
 * work («دورك»), so that count is saffron and only shown when non-zero.
 * TODO(R-SCH-03, R-REP-05, R-SUB-02): الجدول / التقارير / الاشتراكات counts when those land.
 */
export function useNavCounts(): NonNullable<AdminNavProps['counts']> {
  const [students, teachers, newLeads, applicants] = useQueries({
    queries: [
      countQuery('students', '/students?page=1&pageSize=1'),
      countQuery('teachers', '/teachers?page=1&pageSize=1'),
      countQuery('leads', '/leads?status=new&page=1&pageSize=1'),
      countQuery('job-applicants', '/job-applicants?page=1&pageSize=1'),
    ],
  });
  const counts: NonNullable<AdminNavProps['counts']> = {};
  if (students.data !== undefined) counts.students = { text: String(students.data) };
  if (teachers.data !== undefined) counts.teachers = { text: String(teachers.data) };
  if (applicants.data !== undefined) counts.jobApplicants = { text: String(applicants.data) };
  if (newLeads.data) counts.leads = { text: t.nav.newLeads.replace('{n}', String(newLeads.data)), act: true };
  return counts;
}
