import type {
  DraftBody,
  ReportFormResponse,
  ReportV2DraftBody,
  ReportV2SubmitBody,
  ReportView,
  SubmitBody,
} from '@ab/shared';
import { reportErrorCode } from '@ab/client-core';
import { queryOptions } from '@tanstack/react-query';
import { ApiError, publicApiFetch, publicApiSend, type SendMethod } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { REPORTS_KEY, reportErrorText } from '@/features/reporting/reports/api';
import type { ReportApi } from '@/features/reporting/reports/report-api';

// The teacher's signed link to one lesson's report (no login): /public/teacher-report/:token/….

/** What a refused link call means to the page. */
export type LinkProblem = 'invalid' | 'expired' | 'not_open' | 'too_many' | 'failed';

const BY_CODE: Record<string, LinkProblem> = {
  link_not_found: 'invalid',
  link_expired: 'expired',
  link_not_open: 'not_open',
  too_many_requests: 'too_many',
};
const BY_STATUS: Record<number, LinkProblem> = { 404: 'invalid', 410: 'expired', 429: 'too_many' };
const SEND_BY_STATUS: Record<number, LinkProblem> = { 429: 'too_many' };

const statusOf = (error: unknown) => (error instanceof ApiError ? error.status : 0);
const codeProblem = (error: unknown): LinkProblem | undefined => BY_CODE[reportErrorCode(error) ?? ''];

/** Opening the link: its own codes first, else the status (404 wrong, 410 expired, 429 wait). */
export function linkProblem(error: unknown): LinkProblem {
  return codeProblem(error) ?? BY_STATUS[statusOf(error)] ?? 'failed';
}

/** The page's line for a link problem (read on every call: the bundle may be switched). */
export function linkProblemText(problem: LinkProblem): string {
  const w = t.reports.teacherLink;
  const words: Record<LinkProblem, string> = {
    invalid: w.invalid,
    expired: w.expired,
    not_open: w.notOpen,
    too_many: w.tooMany,
    failed: w.loadFailed,
  };
  return words[problem];
}

/** A refused save or send: the link's own words, else the report's (version_conflict, …). */
function linkErrorText(error: unknown): string {
  const problem = codeProblem(error) ?? SEND_BY_STATUS[statusOf(error)];
  return problem ? linkProblemText(problem) : reportErrorText(error);
}

interface Sent<B> {
  id: string;
  body: B;
}
const send = (method: SendMethod, path: string, body: unknown): Promise<ReportView> =>
  publicApiSend(method, path, body);

const base = (token: string) => `/public/teacher-report/${encodeURIComponent(token)}`;

/** GET /public/teacher-report/:token: the lesson's report form, as GET /lessons/:id/report-form. */
export const linkReportFormQuery = (token: string) =>
  queryOptions({
    queryKey: [...REPORTS_KEY, 'link', token],
    queryFn: (): Promise<ReportFormResponse> => publicApiFetch(base(token)),
    retry: false,
    refetchOnWindowFocus: false,
  });

/** The form's calls bound to the link's token; no attachments (they need a session). */
export function linkReportApi(token: string): ReportApi {
  const at = (id: string, step: string) => `${base(token)}/reports/${id}/${step}`;
  return {
    saveDraft: ({ id, body }: Sent<DraftBody>) => send('PUT', at(id, 'draft'), body),
    submitReport: ({ id, body }: Sent<SubmitBody>) => send('POST', at(id, 'submit'), body),
    saveDraftV2: ({ id, body }: Sent<ReportV2DraftBody>) => send('PUT', at(id, 'v2/draft'), body),
    submitReportV2: ({ id, body }: Sent<ReportV2SubmitBody>) =>
      send('POST', at(id, 'v2/submit'), body),
    errorText: linkErrorText,
    attachments: false,
  };
}
