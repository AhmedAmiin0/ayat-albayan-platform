import type { TeacherEarningView, TeacherPaymentView } from '@ab/money';
import { teacherEarningCalls, type SessionFilter } from '@ab/client-core';
import { useQuery } from '@tanstack/react-query';
import { apiFetch, apiSend, pathKey } from '@ab/mobile-kit';
import { usePagedList } from '@/core/lib/query/use-paged-list';
import { earningsPath, type EarningsScope } from '@/earnings/lib/scope';

const calls = teacherEarningCalls({ apiFetch, apiSend });

// Per-session teacher earnings reads (docs/11 §10). Keys are the API path's segments, so
// ['teacher-earnings', teacherId] reaches the balance, the sessions and the payments of a teacher.

export function useEarningsBalance(scope: EarningsScope) {
  return useQuery({
    queryKey: pathKey(earningsPath(scope, 'balance')),
    queryFn: () => calls.balance(scope.teacherId),
  });
}

export function useEarningsSessions(scope: EarningsScope, status: SessionFilter) {
  return usePagedList<TeacherEarningView>({
    path: earningsPath(scope, 'sessions'),
    params: { status: status === 'all' ? undefined : status },
  });
}

export function useEarningsPayments(scope: EarningsScope) {
  return usePagedList<TeacherPaymentView>({ path: earningsPath(scope, 'payments') });
}
