import type { Permission } from '@ab/catalog';
import { useQueries } from '@tanstack/react-query';
import type { AdminNavProps } from '@/components/shell/nav/AdminNav';
import { unreadCountQuery, useInboxLive } from '@/features/messaging/inbox';
import { studentCalls, teacherCalls } from '@ab/client-core';
import { apiFetch, apiSend, t, call } from '@ab/web-kit';
import { navCountKey } from './nav-count.keys';

interface Total {
  total: number;
}

const ONE_ROW = { page: '1', pageSize: '1' };
const studentApi = studentCalls({ apiFetch, apiSend });
const teacherApi = teacherCalls({ apiFetch, apiSend });

/** `total` of a paged list endpoint at pageSize=1. Keys sit under each feature's prefix, so the
 *  features' own invalidateQueries(['students']) etc. refresh the counts too. */
const countQuery = (prefix: string, path: string, enabled: boolean) => ({
  enabled,
  queryKey: navCountKey(prefix, path),
  queryFn: ({ signal }: { signal: AbortSignal }) => call<Total>({ path, signal }),
  staleTime: 60_000,
  select: (p: Total) => p.total,
});

/** The same count read through a list route, so a row that breaks the route shows no count. */
const routeCount = (prefix: string, read: () => Promise<Total>, enabled: boolean) => ({
  ...countQuery(prefix, `/${prefix}?page=1&pageSize=1`, enabled),
  queryFn: read,
});

/** Counts from data the Phase 1 API returns (docs/07 §7); new leads in saffron, only when > 0. */
export function useNavCounts(
  can: (p: Permission) => boolean = () => true,
): NonNullable<AdminNavProps['counts']> {
  useInboxLive(); // a realtime connect / drop re-reads the badge's poll interval
  const [students, teachers, newLeads, applicants, unread] = useQueries({
    queries: [
      // Only what the user may read (dynamic roles): no 403s for a custom role.
      routeCount('students', () => studentApi.list(ONE_ROW), can('students.read')),
      routeCount('teachers', () => teacherApi.list(ONE_ROW), can('teachers.read')),
      countQuery('leads', '/leads?status=new&page=1&pageSize=1', can('leads.read')),
      countQuery('job-applicants', '/job-applicants?page=1&pageSize=1', can('applicants.read')),
      // Threads with a message no admin has opened (Phase 4 H1), also the admin's turn: the chats
      // list's own summary, polled like the list (docs/44 BUG4).
      unreadCountQuery(can('inbox.read')),
    ],
  });
  const counts: NonNullable<AdminNavProps['counts']> = {};
  if (students.data !== undefined) counts.students = { text: String(students.data) };
  if (teachers.data !== undefined) counts.teachers = { text: String(teachers.data) };
  if (applicants.data !== undefined) counts.jobApplicants = { text: String(applicants.data) };
  if (newLeads.data)
    counts.leads = { text: t.nav.newLeads.replace('{n}', String(newLeads.data)), act: true };
  if (unread.data)
    counts.inbox = { text: t.nav.unread.replace('{n}', String(unread.data)), act: true };
  return counts;
}
