import type {
  SalesScheduleDay,
  SalesStudentView,
  SalesSubscriptionHistory,
  SalesTeacherView,
} from '@ab/shared';
import type { AssistantLessonView } from '@ab/schedule';
import { keepPreviousData, queryOptions } from '@tanstack/react-query';
import { apiFetch } from '@ab/web-kit';
import { salesKeys, salesSubscriptionKeys } from '@/features/sales/keys';

// The salesperson's assistant side (docs/16) and a subscription's history. Read-only, no money.

export const ALL_STUDENTS_PAGE_SIZE = 25;
/** The running lessons are re-read every minute: one ends, another starts. */
const LIVE_REFRESH_MS = 60_000;

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

/** GET /sales/teachers — every active teacher with the students they teach. */
export const salesTeachersQuery = queryOptions({
  queryKey: salesKeys.teachers(),
  queryFn: () => apiFetch<SalesTeacherView[]>('/sales/teachers'),
});

/** GET /sales/students/all?page&pageSize&search — every student, one page. */
export const salesAllStudentsQuery = (q: { page: number; search: string }) =>
  queryOptions({
    queryKey: salesKeys.allStudents(q),
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(q.page),
        pageSize: String(ALL_STUDENTS_PAGE_SIZE),
      });
      if (q.search) params.set('search', q.search);
      return apiFetch<Paged<SalesStudentView>>(`/sales/students/all?${params}`);
    },
    placeholderData: keepPreviousData,
  });

/** GET /sales/live — the lessons running now across the academy. */
export const salesLiveQuery = queryOptions({
  queryKey: salesKeys.live(),
  queryFn: () => apiFetch<AssistantLessonView[]>('/sales/live'),
  refetchInterval: LIVE_REFRESH_MS,
});

/** GET /sales/schedule: one Riyadh day of the academy, read-only; re-read every minute. */
export const salesScheduleQuery = (q: { date: string; teacherId?: string | undefined }) =>
  queryOptions({
    queryKey: salesKeys.scheduleDay(q),
    queryFn: () => {
      const params = new URLSearchParams({ date: q.date });
      if (q.teacherId) params.set('teacherId', q.teacherId);
      return apiFetch<SalesScheduleDay>(`/sales/schedule?${params}`);
    },
    placeholderData: keepPreviousData,
    refetchInterval: LIVE_REFRESH_MS,
  });

/** GET /sales/subscriptions/:id/history — one of my subscriptions and its student's history. */
export const subscriptionHistoryQuery = (id: string) =>
  queryOptions({
    queryKey: salesSubscriptionKeys.history(id),
    queryFn: () => apiFetch<SalesSubscriptionHistory>(`/sales/subscriptions/${id}/history`),
  });
