import type { TeacherEarningsBalanceView, TeacherEarningView, TeacherPaymentView } from '@ab/money';
import type { SessionFilter } from '@ab/client-core';
import { useQuery } from '@tanstack/react-query';
import { apiFetch, pathKey } from '@ab/mobile-kit';
import { usePagedList } from '@/core/lib/query/use-paged-list';
import { earningsBase, type EarningsScope } from '@/earnings/lib/scope';

// Per-session teacher earnings reads (docs/11 §10). Keys are the API path's segments, so
// ['teacher-earnings', teacherId] reaches the balance, the sessions and the payments of a teacher.

export function useEarningsBalance(scope: EarningsScope) {
  const path = earningsBase(scope);
  return useQuery({
    queryKey: pathKey(path),
    queryFn: () => apiFetch<TeacherEarningsBalanceView>(path),
  });
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
