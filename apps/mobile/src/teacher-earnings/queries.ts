import type { TeacherEarningsView, TeacherPaymentView } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { pathKey } from '@/lib/query-keys';

// Per-session teacher earnings reads. Both screens share them: `base` is `/teachers/me` for the
// teacher (scoped by her session) or `/teachers/:id` for an admin. The payments key sits under the
// earnings key, so invalidating `earningsKey(base)` refreshes the balance, sessions and history.

export const MY_BASE = '/teachers/me';

export const teacherBase = (teacherId: string): string => `/teachers/${teacherId}`;
export const earningsKey = (base: string): string[] => pathKey(`${base}/earnings`);

/** GET {base}/earnings: balance + sessions, newest first. */
export function useEarnings(base: string) {
  const path = `${base}/earnings`;
  return useQuery({ queryKey: earningsKey(base), queryFn: () => apiFetch<TeacherEarningsView>(path) });
}

/** GET {base}/earnings/payments: the payment history, newest first. */
export function useEarningPayments(base: string) {
  const path = `${base}/earnings/payments`;
  return useQuery({ queryKey: pathKey(path), queryFn: () => apiFetch<TeacherPaymentView[]>(path) });
}
