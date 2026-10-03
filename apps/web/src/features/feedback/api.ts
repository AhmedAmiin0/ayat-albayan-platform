import { keepPreviousData, queryOptions } from '@tanstack/react-query';
import { errorCode } from '@/features/schedule/api';
import { ApiError, apiFetch, apiSend } from '@/lib/api';
import { env } from '@/lib/env';
import { t } from '@/lib/i18n';
import {
  FEEDBACK_KINDS,
  type FeedbackFilters,
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

/** GET /feedback (admin): newest first, filtered and paged on the server. */
export const feedbackListQuery = (f: FeedbackFilters) =>
  queryOptions({
    queryKey: [...FEEDBACK_KEY, 'list', f],
    queryFn: () => {
      const qs = new URLSearchParams({ page: String(f.page), pageSize: String(FEEDBACK_PAGE_SIZE) });
      if (f.teacherId) qs.set('teacher', f.teacherId);
      if (f.kind) qs.set('kind', f.kind);
      if (f.rating) qs.set('rating', String(f.rating));
      return apiFetch<FeedbackPage>(`/feedback?${qs}`);
    },
    placeholderData: keepPreviousData,
  });

/** GET /feedback/summary (admin): average, count and «نسبة الترشيح» per teacher. */
export const feedbackSummaryQuery = queryOptions({
  queryKey: [...FEEDBACK_KEY, 'summary'],
  queryFn: () => apiFetch<TeacherFeedbackSummary[]>('/feedback/summary'),
});

/** GET /teachers/me/feedback: only my rows, and my own average. */
export const myFeedbackQuery = queryOptions({
  queryKey: [...FEEDBACK_KEY, 'mine'],
  queryFn: () => apiFetch<TeacherFeedbackView>('/teachers/me/feedback'),
});

/** POST /lessons/:id/feedback-request (admin): queues the «رأيك يهمّنا» WhatsApp template. */
export const requestFeedback = ({ lessonId, studentId }: { lessonId: string; studentId: string }) =>
  apiSend('POST', `/lessons/${lessonId}/feedback-request`, { studentId });

/** The Arabic / English line for a failed «ابعت طلب الرأي». */
export function requestErrorText(error: unknown): string {
  return errorCode(error) === 'template_not_approved' ? t.feedback.templateNotApproved : t.feedback.requestFailed;
}
