import type { MyEarnings, MyPaymentRow, MyStudentRow } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { pathKey } from '@/lib/query-keys';

// The salesperson's own money pages (R-ASST-06, web apps/web/src/features/sales/api.ts). The API
// answers only for the caller; amounts stay per currency, never summed across them.

/** A body that is not a list (an older API, a stub) reads as an empty list rather than crashing. */
const asList = <T>(data: T[]): T[] => (Array.isArray(data) ? data : []);

/** GET /sales/me/students — the students I brought, newest first; no price, only «paid or not». */
export const useMyStudents = () =>
  useQuery({
    queryKey: pathKey('/sales/me/students'),
    queryFn: () => apiFetch<MyStudentRow[]>('/sales/me/students'),
    select: asList,
  });

/** GET /sales/me/earnings — my terms, this month so far, commissions earned and my statements. */
export const useMyEarnings = () =>
  useQuery({ queryKey: pathKey('/sales/me/earnings'), queryFn: () => apiFetch<MyEarnings>('/sales/me/earnings') });

/** GET /sales/me/payments — only the payments I recorded. */
export const useMyPayments = () =>
  useQuery({
    queryKey: pathKey('/sales/me/payments'),
    queryFn: () => apiFetch<MyPaymentRow[]>('/sales/me/payments'),
    select: asList,
  });
