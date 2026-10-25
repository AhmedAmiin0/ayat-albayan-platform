import type { AssistantLessonView, SalesScheduleDay, SalesSubscriptionHistory, SalesTeacherView } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/core/lib/http/api';
import { pathKey } from '@/core/lib/query/query-keys';

// The salesperson's pages (docs/16, web parity with apps/web/src/features/sales): read-only, no money.

export type SubscriptionKind = 'pending' | 'confirmed';

/** One of my subscriptions (GET /sales/subscriptions?kind=). Never a price or a payment. */
export interface SalesSubscription {
  id: string;
  student: { id: string; code: string; name: string };
  package: string | null;
  status: string;
  starts_on: string | null;
  lessons_total: number;
}

/** The running lessons are re-read every minute: one ends, another starts (same as the web). */
export const LIVE_REFRESH_MS = 60_000;

/** A body that is not a list (an older API, a stub) reads as an empty list rather than crashing. */
const asList = <T>(data: T[]): T[] => (Array.isArray(data) ? data : []);

/** GET /sales/subscriptions?kind= — my pending or my confirmed subscriptions, one list per kind. */
export const useSalesSubscriptions = (kind: SubscriptionKind) =>
  useQuery({
    queryKey: [...pathKey('/sales/subscriptions'), kind],
    queryFn: () => apiFetch<SalesSubscription[]>(`/sales/subscriptions?kind=${kind}`),
    select: asList,
  });

/** GET /sales/subscriptions/:id/history — one of my confirmed subscriptions and its student's history. */
export const useSubscriptionHistory = (id: string) =>
  useQuery({
    queryKey: pathKey(`/sales/subscriptions/${id}/history`),
    queryFn: () => apiFetch<SalesSubscriptionHistory>(`/sales/subscriptions/${id}/history`),
    enabled: id !== '',
  });

/** GET /sales/teachers — every active teacher with the students they teach. */
export const useSalesTeachers = () =>
  useQuery({
    queryKey: pathKey('/sales/teachers'),
    queryFn: () => apiFetch<SalesTeacherView[]>('/sales/teachers'),
    select: asList,
  });

/** GET /sales/live — the lessons running now across the academy. */
export const useSalesLive = () =>
  useQuery({
    queryKey: pathKey('/sales/live'),
    queryFn: () => apiFetch<AssistantLessonView[]>('/sales/live'),
    select: asList,
    refetchInterval: LIVE_REFRESH_MS,
  });

/** GET /sales/schedule?date&teacherId — one Riyadh day of the academy, read-only, re-read every minute. */
export const useSalesSchedule = (date: string, teacherId: string) =>
  useQuery({
    queryKey: [...pathKey('/sales/schedule'), date, teacherId],
    queryFn: () => apiFetch<SalesScheduleDay>(`/sales/schedule?date=${date}${teacherId ? `&teacherId=${teacherId}` : ''}`),
    refetchInterval: LIVE_REFRESH_MS,
  });
