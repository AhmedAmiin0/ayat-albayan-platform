import { keepPreviousData, queryOptions } from '@tanstack/react-query';
import { errorCode } from '@/features/teaching/schedule';
import { ApiError, apiFetch, apiSend } from '@/lib/http/api';
import { env } from '@/lib/http/env';
import { t } from '@/lib/i18n/i18n';
import { sortFilterParams } from '@/lib/list/list-search';
import type { ServerListState } from '@/lib/list/server-list-search';
import {
  FEEDBACK_KINDS,
  type FeedbackFormView,
  type FeedbackPage,
  type FeedbackSubmitBody,
  type TeacherFeedbackSummary,
  type TeacherFeedbackView,
} from './types';

export const FEEDBACK_KEY = ['feedback'] as const;
export const FEEDBACK_PAGE_SIZE = 20;

// ---- Public (the guardian's link, no login). Plain fetch: never the admin's session token. ----

function parseBody(text: string): unknown {
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}

async function publicFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${env.apiUrl}${path}`, init);
  const body = parseBody(await res.text());
  if (!res.ok) throw new ApiError(res.status, body);
  return body as T;
}

/** The one place that knows the public GET's shape (camelCase); a rename changes only this. */
export function toFormView(raw: unknown): FeedbackFormView {
  const r = (raw ?? {}) as Record<string, unknown>;
  const kind = FEEDBACK_KINDS.find((k) => k === r['kind']);
  if (typeof r['teacherName'] !== 'string' || !kind) throw new ApiError(502, raw);
  return {
    teacherName: r['teacherName'],
    kind,
    contactPhone: typeof r['contactPhone'] === 'string' ? r['contactPhone'] : '',
    alreadySubmitted: r['alreadySubmitted'] === true,
  };
}

/** GET /public/feedback/:token. Any 4xx = a link that is wrong (404) or expired (410); retrying cannot help. */
export const publicFeedbackQuery = (token: string) =>
  queryOptions({
    queryKey: [...FEEDBACK_KEY, 'public', token],
    queryFn: async () => toFormView(await publicFetch<unknown>(`/public/feedback/${encodeURIComponent(token)}`)),
    retry: (count, error) => !(error instanceof ApiError && error.status < 500) && count < 2,
    refetchOnWindowFocus: false,
  });

/** POST /public/feedback/:token (the unique row is the hard guard: a second send is 409). */
export const submitFeedback = ({ token, body }: { token: string; body: FeedbackSubmitBody }) =>
  publicFetch<undefined>(`/public/feedback/${encodeURIComponent(token)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

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
  new URLSearchParams([['page', String(s.page)], ['pageSize', String(FEEDBACK_PAGE_SIZE)], ...sortFilterParams(s.sort, s.filters)]);

/** GET /feedback (admin): newest first unless sorted; filtered and paged on the server (R-NFR-08). */
export const feedbackListQuery = (s: ServerListState) =>
  queryOptions({
    queryKey: [...FEEDBACK_KEY, 'list', s],
    queryFn: () => apiFetch<FeedbackPage>(`/feedback?${listParams(s)}`),
    placeholderData: keepPreviousData,
  });

/** GET /feedback/summary (admin): average, count and «نسبة الترشيح» per teacher. */
export const feedbackSummaryQuery = queryOptions({
  queryKey: [...FEEDBACK_KEY, 'summary'],
  queryFn: () => apiFetch<TeacherFeedbackSummary[]>('/feedback/summary'),
});

/** GET /teachers/me/feedback: only my rows (sorted, filtered, paged like the admin's) and my own average. */
export const myFeedbackQuery = (s: ServerListState) =>
  queryOptions({
    queryKey: [...FEEDBACK_KEY, 'mine', s],
    queryFn: () => apiFetch<TeacherFeedbackView>(`/teachers/me/feedback?${listParams(s)}`),
    placeholderData: keepPreviousData,
  });

/** POST /lessons/:id/feedback-request (admin): queues the «رأيك يهمّنا» WhatsApp template. */
export const requestFeedback = ({ lessonId, studentId }: { lessonId: string; studentId: string }) =>
  apiSend('POST', `/lessons/${lessonId}/feedback-request`, { studentId });

/** The Arabic / English line for a failed «ابعت طلب الرأي». */
export function requestErrorText(error: unknown): string {
  return errorCode(error) === 'template_not_approved' ? t.feedback.templateNotApproved : t.feedback.requestFailed;
}
