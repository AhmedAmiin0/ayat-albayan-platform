import type { AcademySettings, PaymentView, StudentBalanceView } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { apiFetch, toQueryString } from '@/core/lib/http/api';
import type { Page } from '@/core/lib/query/paging';
import { listKey, pathKey } from '@/core/lib/query/query-keys';

// Money reads (docs/11 §6–7). Keys follow lib/query-keys, so invalidating ['students', id] reaches
// the balance and ['payments'] reaches every payments list.

const MINUTE = 60_000;
const balancePath = (studentId: string) => `/students/${studentId}/balance`;

/** ['students', id, 'balance']. */
export const balanceKey = (studentId: string) => pathKey(balancePath(studentId));

/**
 * GET /students/:id/balance (S6): the packages, oldest first, and what is left. Fresh for 5
 * minutes: Today asks once per student on its cards (GET /lessons/day carries no balance), not on
 * every return to the app.
 */
export function useStudentBalance(studentId: string) {
  return useQuery({
    queryKey: balanceKey(studentId),
    queryFn: () => apiFetch<StudentBalanceView>(balancePath(studentId)),
    staleTime: 5 * MINUTE,
  });
}

/** settings.renewal_alert_remaining (R-SUB-02); undefined until it loads (lines use the default). */
export function useRenewalThreshold(): number | undefined {
  const { data } = useQuery({
    queryKey: pathKey('/settings'),
    queryFn: () => apiFetch<AcademySettings>('/settings'),
    staleTime: 60 * MINUTE,
  });
  return data?.renewal_alert_remaining;
}

/** The student's latest payments on the quick view (P1, newest first). */
const recentParams = (studentId: string) => ({ studentId, pageSize: 5 });

export function useRecentPayments(studentId: string) {
  const params = recentParams(studentId);
  return useQuery({
    queryKey: listKey('/payments', params),
    queryFn: () => apiFetch<Page<PaymentView>>(`/payments${toQueryString(params)}`),
  });
}
