import type { Permission } from '@ab/shared';
import { useQueries } from '@tanstack/react-query';
import type { AdminNavProps } from '@/components/shell/nav/AdminNav';
import { apiFetch } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';

type Total = { total: number };

/** `total` of a paged list endpoint at pageSize=1. Keys sit under each feature's prefix, so the
 *  features' own invalidateQueries(['students']) etc. refresh the counts too. */
const countQuery = (prefix: string, path: string, enabled: boolean) => ({
  enabled,
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
export function useNavCounts(can: (p: Permission) => boolean = () => true): NonNullable<AdminNavProps['counts']> {
  const [students, teachers, newLeads, applicants, unread] = useQueries({
    queries: [
      // Only what the user may read (dynamic roles): no 403s for a custom role.
      countQuery('students', '/students?page=1&pageSize=1', can('students.read')),
      countQuery('teachers', '/teachers?page=1&pageSize=1', can('teachers.read')),
      countQuery('leads', '/leads?status=new&page=1&pageSize=1', can('leads.read')),
      countQuery('job-applicants', '/job-applicants?page=1&pageSize=1', can('applicants.read')),
      // Threads with a message no admin has opened (Phase 4 H1), also the admin's turn.
      countQuery('threads', '/threads?unread=true&page=1&pageSize=1', can('inbox.read')),
    ],
  });
  const counts: NonNullable<AdminNavProps['counts']> = {};
  if (students.data !== undefined) counts.students = { text: String(students.data) };
  if (teachers.data !== undefined) counts.teachers = { text: String(teachers.data) };
  if (applicants.data !== undefined) counts.jobApplicants = { text: String(applicants.data) };
  if (newLeads.data) counts.leads = { text: t.nav.newLeads.replace('{n}', String(newLeads.data)), act: true };
  if (unread.data) counts.inbox = { text: t.nav.unread.replace('{n}', String(unread.data)), act: true };
  return counts;
}
