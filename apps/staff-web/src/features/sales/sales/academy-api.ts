import { keepPreviousData, queryOptions } from '@tanstack/react-query';
import { salesAcademyDayCalls, salesAcademyListCalls } from '@ab/client-core';
import { apiFetch, apiSend } from '@ab/web-kit';
import { salesKeys, salesSubscriptionKeys } from '@/features/sales/keys';

// The salesperson's assistant side (docs/16) and a subscription's history. Read-only, no money.

export const ALL_STUDENTS_PAGE_SIZE = 25;
/** The running lessons are re-read every minute: one ends, another starts. */
const LIVE_REFRESH_MS = 60_000;
const academyDay = salesAcademyDayCalls({ apiFetch, apiSend });
const academyLists = salesAcademyListCalls({ apiFetch, apiSend });

/** GET /sales/teachers — every active teacher with the students they teach. */
export const salesTeachersQuery = queryOptions({
  queryKey: salesKeys.teachers(),
  queryFn: () => academyLists.teachers(),
});

/** GET /sales/students/all?page&pageSize&search — every student, one page. */
export const salesAllStudentsQuery = (q: { page: number; search: string }) =>
  queryOptions({
    queryKey: salesKeys.allStudents(q),
    queryFn: () =>
      academyLists.students({
        page: q.page,
        pageSize: ALL_STUDENTS_PAGE_SIZE,
        search: q.search || undefined,
      }),
    placeholderData: keepPreviousData,
  });

/** GET /sales/live — the lessons running now across the academy. */
export const salesLiveQuery = queryOptions({
  queryKey: salesKeys.live(),
  queryFn: () => academyDay.live(),
  refetchInterval: LIVE_REFRESH_MS,
});

/** GET /sales/schedule?date&teacherId — one Riyadh day of the academy, read-only; re-read every minute (now moves). */
export const salesScheduleQuery = (q: { date: string; teacherId?: string | undefined }) =>
  queryOptions({
    queryKey: salesKeys.scheduleDay(q),
    queryFn: () => academyDay.day({ date: q.date, teacherId: q.teacherId || undefined }),
    placeholderData: keepPreviousData,
    refetchInterval: LIVE_REFRESH_MS,
  });

/** GET /sales/subscriptions/:id/history — one of my subscriptions and its student's history. */
export const subscriptionHistoryQuery = (id: string) =>
  queryOptions({
    queryKey: salesSubscriptionKeys.history(id),
    queryFn: () => academyLists.history(id),
  });
