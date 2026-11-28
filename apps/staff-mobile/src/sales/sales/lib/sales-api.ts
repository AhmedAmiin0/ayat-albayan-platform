import type { SalesScheduleDay, SalesSubscriptionKind } from '@ab/shared';
import { riyadhToday } from '@ab/time';
import { salesAcademyDayCalls, salesAcademyListCalls, salesPortalCalls } from '@ab/client-core';
import { useQuery } from '@tanstack/react-query';
import { apiFetch, apiSend, pathKey } from '@ab/mobile-kit';
import { salesKeys } from '@/core/lib/keys';

// The salesperson's pages (docs/16, web parity with apps/staff-web/src/features/sales): read-only, no money.

/** The running lessons are re-read every minute: one ends, another starts (same as the web). */
const LIVE_REFRESH_MS = 60_000;

const salesPortal = salesPortalCalls({ apiFetch, apiSend });
const academyDay = salesAcademyDayCalls({ apiFetch, apiSend });
const academyLists = salesAcademyListCalls({ apiFetch, apiSend });

/** GET /sales/subscriptions?kind= — my pending or my confirmed subscriptions, one list per kind. */
export const useSalesSubscriptions = (kind: SalesSubscriptionKind) =>
  useQuery({
    queryKey: salesKeys.subscriptions(kind),
    queryFn: () => salesPortal.subscriptions(kind),
  });

/** GET /sales/subscriptions/:id/history — one of my confirmed subscriptions and its student's history. */
export const useSubscriptionHistory = (id: string) =>
  useQuery({
    queryKey: pathKey(`/sales/subscriptions/${id}/history`),
    queryFn: () => academyLists.history(id),
    enabled: id !== '',
  });

/** GET /sales/teachers — every active teacher with the students they teach. */
export const useSalesTeachers = () =>
  useQuery({
    queryKey: pathKey('/sales/teachers'),
    queryFn: () => academyLists.teachers(),
  });

/** GET /sales/live — the lessons running now across the academy. */
export const useSalesLive = () =>
  useQuery({
    queryKey: pathKey('/sales/live'),
    queryFn: () => academyDay.live(),
    refetchInterval: LIVE_REFRESH_MS,
  });

/** GET /sales/schedule?date&teacherId — one Riyadh day of the academy, read-only, re-read every minute. */
const salesScheduleQuery = (date: string, teacherId: string) => ({
  queryKey: salesKeys.schedule(date, teacherId),
  queryFn: () => academyDay.day({ date, teacherId: teacherId || undefined }),
  refetchInterval: LIVE_REFRESH_MS,
});

export const useSalesSchedule = (date: string, teacherId: string) =>
  useQuery(salesScheduleQuery(date, teacherId));

const lessonsOf = (day: SalesScheduleDay) => day.lessons;

/** Reuses the schedule query on the Riyadh day of `now` for every teacher (one cache). */
// academy day (docs/34 b): GET /sales/schedule `?date` is a Riyadh day.
export const useSalesDay = (now: Date) =>
  useQuery({ ...salesScheduleQuery(riyadhToday(now), ''), select: lessonsOf });
