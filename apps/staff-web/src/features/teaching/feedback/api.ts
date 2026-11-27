import { keepPreviousData, queryOptions } from '@tanstack/react-query';
import { errorCode } from '@/features/teaching/schedule';
import { feedbackCalls, publicFeedbackCalls } from '@ab/client-core';
import { ApiError, apiFetch, apiSend, publicApiFetch, publicApiSend, t } from '@ab/web-kit';
import { sortFilterParams } from '@/lib/list/list-search';
import type { ServerListState } from '@/lib/list/server-list-search';
import type { FeedbackRowView, FeedbackSubmit, TeacherFeedbackView } from '@ab/shared';
import type { Page } from '@ab/core';
import { feedbackKeys } from '@/features/teaching/feedback/keys';

export const FEEDBACK_KEY = feedbackKeys.all;
export const FEEDBACK_PAGE_SIZE = 20;

const feedback = feedbackCalls({ apiFetch, apiSend });

// The guardian's link has no login: these calls never carry the admin's session token.
const guardian = publicFeedbackCalls({ apiFetch: publicApiFetch, apiSend: publicApiSend });

/** GET /public/feedback/:token. Any 4xx = a link that is wrong (404) or expired (410); retrying cannot help. */
export const publicFeedbackQuery = (token: string) =>
  queryOptions({
    queryKey: feedbackKeys.public(token),
    queryFn: () => guardian.form(token),
    retry: (count, error) => !(error instanceof ApiError && error.status < 500) && count < 2,
    refetchOnWindowFocus: false,
  });

/** POST /public/feedback/:token (the unique row is the hard guard: a second send is 409). */
export const submitFeedback = ({ token, body }: { token: string; body: FeedbackSubmit }) =>
  guardian.submit(token, body);

/** What a failed public call means to the page. */
export type PublicProblem = 'expired' | 'invalid' | 'already' | 'too_many' | 'failed';

export function publicProblem(error: unknown): PublicProblem {
  if (!(error instanceof ApiError)) return 'failed';
  if (error.status === 429) return 'too_many';
  if (error.status === 409 || errorCode(error) === 'already_submitted') return 'already';
  if (error.status === 410) return 'expired';
  return error.status >= 400 && error.status < 500 ? 'invalid' : 'failed';
}

// ---- Admin and teacher ----

/** `?page&pageSize` plus the URL's sort and column filters (their keys are the API's params). */
const listParams = (s: ServerListState): URLSearchParams =>
  new URLSearchParams([
    ['page', String(s.page)],
    ['pageSize', String(FEEDBACK_PAGE_SIZE)],
    ...sortFilterParams(s.sort, s.filters),
  ]);

/** GET /feedback (admin): newest first unless sorted; filtered and paged on the server (R-NFR-08). */
export const feedbackListQuery = (s: ServerListState) =>
  queryOptions({
    queryKey: feedbackKeys.list(s),
    queryFn: () => apiFetch<Page<FeedbackRowView>>(`/feedback?${listParams(s)}`),
    placeholderData: keepPreviousData,
  });

/** Admin only: average, count and recommend rate per teacher. */
export const feedbackSummaryQuery = queryOptions({
  queryKey: feedbackKeys.summary(),
  queryFn: () => feedback.summary(),
});

/** GET /teachers/me/feedback: only my rows (sorted, filtered, paged like the admin's) and my own average. */
export const myFeedbackQuery = (s: ServerListState) =>
  queryOptions({
    queryKey: feedbackKeys.mine(s),
    queryFn: () => apiFetch<TeacherFeedbackView>(`/teachers/me/feedback?${listParams(s)}`),
    placeholderData: keepPreviousData,
  });

/** Admin only: queues the feedback WhatsApp template. */
export const requestFeedback = feedback.request;

export function requestErrorText(error: unknown): string {
  return errorCode(error) === 'template_not_approved'
    ? t.feedback.templateNotApproved
    : t.feedback.requestFailed;
}
