import {
  reportAccessViewSchema,
  reportPageViewSchema,
  type ReportAccessView,
  type ReportCodeTarget,
  type ReportPageView,
} from '@ab/shared';
import { reportErrorCode } from '@ab/client-core';
import { queryOptions } from '@tanstack/react-query';
import { publicApiFetch } from '@/lib/http/api';

// The report page without a session (owner 2026-11-06): a WhatsApp code, then this report's
// HttpOnly cookie (credentials: 'include'; the API is same-site with the web app).

const base = (publicId: string) => `/public/report-pages/${publicId}`;
const withCookie: RequestInit = { credentials: 'include' };

const post = (path: string, body: unknown) =>
  publicApiFetch(path, {
    ...withCookie,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

/** The page with this report's cookie; 401 code_required without one. */
export const publicPageQuery = (publicId: string) =>
  queryOptions<ReportPageView>({
    queryKey: ['report-page', publicId, 'public'],
    queryFn: async () =>
      reportPageViewSchema.parse(await publicApiFetch(base(publicId), withCookie)),
    retry: false,
  });

/** The masked numbers a code may go to. */
export const accessQuery = (publicId: string) =>
  queryOptions<ReportAccessView>({
    queryKey: ['report-page', publicId, 'access'],
    queryFn: async () =>
      reportAccessViewSchema.parse(await publicApiFetch(`${base(publicId)}/access`)),
    retry: false,
  });

export const requestCode = (input: { publicId: string; to: ReportCodeTarget }) =>
  post(`${base(input.publicId)}/code`, { to: input.to });

export const verifyCode = (input: { publicId: string; code: string }) =>
  post(`${base(input.publicId)}/verify`, { code: input.code });

/** What a refused code step means to the page. */
export type GateProblem = 'invalid' | 'tooMany' | 'unavailable' | 'failed';

const BY_CODE: Record<string, GateProblem> = {
  invalid_code: 'invalid',
  too_many_requests: 'tooMany',
  codes_unavailable: 'unavailable',
};

export const gateProblem = (error: unknown): GateProblem =>
  BY_CODE[reportErrorCode(error) ?? ''] ?? 'failed';

/** The public page asks for a code (401), unlike an unknown report (404). */
export const needsCode = (error: unknown): boolean => reportErrorCode(error) === 'code_required';
