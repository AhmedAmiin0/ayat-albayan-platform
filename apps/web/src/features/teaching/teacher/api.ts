import type { LessonProposalRequest, LessonView, PayoutView, TeacherMe, TeacherReportView } from '@ab/shared';
import { keepPreviousData, queryOptions } from '@tanstack/react-query';
import type { Page } from '@/features/sales/leads/types';
import { REPORTS_KEY } from '@/features/reporting/reports/api';
import { LESSONS_KEY, type Window } from '@/features/teaching/schedule';
import { MONEY_KEY } from '@/features/finance/subscriptions/api';
import { apiFetch, apiSend } from '@/lib/http/api';
import { sortFilterParams } from '@/lib/list/list-search';
import type { ServerListState } from '@/lib/list/server-list-search';

// Teacher self-service routes (docs/10 §5 rows 3–4; R-TCH-03, R-SCH-08).

/** GET /teachers/me — 404 `teacher_not_linked` when the login has no teachers row. */
export const teacherMeQuery = queryOptions({
  queryKey: ['teachers', 'me'],
  queryFn: () => apiFetch<TeacherMe>('/teachers/me'),
  retry: false,
});

/** GET /teachers/me/lessons?from&to — own lessons only, every status. */
export const myLessonsQuery = (w: Window) => {
  const params = new URLSearchParams({ from: w.from.toISOString(), to: w.to.toISOString() });
  return queryOptions({
    queryKey: [...LESSONS_KEY, 'mine', params.toString()],
    queryFn: () => apiFetch<LessonView[]>(`/teachers/me/lessons?${params}`),
    placeholderData: keepPreviousData,
  });
};

/** POST /lessons/:id/propose — «اقترح ميعاد تاني» for the admin to approve (R-SCH-08). */
export const proposeLesson = ({ id, body }: { id: string; body: LessonProposalRequest }) =>
  apiSend<LessonView>('POST', `/lessons/${id}/propose`, body);

export const MY_REPORTS_PAGE_SIZE = 20;

/** GET /teachers/me/reports — my sent reports, newest first unless sorted, filtered (R-NFR-08), with the edit window (spec §3). */
export const myReportsQuery = (s: ServerListState) =>
  queryOptions({
    queryKey: [...REPORTS_KEY, 'mine', s],
    queryFn: () => {
      const qs = new URLSearchParams([['page', String(s.page)], ['pageSize', String(MY_REPORTS_PAGE_SIZE)], ...sortFilterParams(s.sort, s.filters)]);
      return apiFetch<Page<TeacherReportView>>(`/teachers/me/reports?${qs}`);
    },
    placeholderData: keepPreviousData,
  });

/** GET /teachers/me/payouts — every month of mine, newest first (R-TCH-04). */
export const myPayoutsQuery = queryOptions({
  queryKey: [...MONEY_KEY, 'payouts', 'mine'],
  queryFn: () => apiFetch<PayoutView[]>('/teachers/me/payouts'),
});
