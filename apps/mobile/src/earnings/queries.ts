import type { TeacherEarningsBalanceView, TeacherEarningView, TeacherPaymentView } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { pathKey } from '@/lib/query-keys';
import { usePagedList } from '@/lib/use-paged-list';
import { earningsBase, type EarningsScope } from './scope';

// Per-session teacher earnings reads (docs/11 §10). Keys are the API path's segments, so
// ['teacher-earnings', teacherId] reaches the balance, the sessions and the payments of a teacher.

export type SessionFilter = 'all' | 'unpaid' | 'paid';

export function useEarningsBalance(scope: EarningsScope) {
  const path = earningsBase(scope);
  return useQuery({ queryKey: pathKey(path), queryFn: () => apiFetch<TeacherEarningsBalanceView>(path) });
}

export function useEarningsSessions(scope: EarningsScope, status: SessionFilter) {
  return usePagedList<TeacherEarningView>({
    path: `${earningsBase(scope)}/sessions`,
    params: { status: status === 'all' ? undefined : status },
  });
}

export function useEarningsPayments(scope: EarningsScope) {
  return usePagedList<TeacherPaymentView>({ path: `${earningsBase(scope)}/payments` });
}
