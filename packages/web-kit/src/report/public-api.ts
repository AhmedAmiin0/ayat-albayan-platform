import {
  reportPublicRoutes as routes,
  type ReportAccessView,
  type ReportCodeTarget,
  type ReportPageView,
} from '@ab/shared';
import { reportErrorCode } from '@ab/client-core';
import { queryOptions } from '@tanstack/react-query';
import { cookieCall } from '@ab/web-kit/lib/http/api';

// The report page without a session: a WhatsApp code, then this report's
// HttpOnly cookie (the API is same-site with the web app).

/** The page with this report's cookie; 401 code_required without one. */
export const publicPageQuery = (publicId: string) =>
  queryOptions<ReportPageView>({
    queryKey: ['report-page', publicId, 'public'],
    queryFn: () => cookieCall({ route: routes.view, params: { publicId } }),
    retry: false,
  });

/** The masked numbers a code may go to. */
export const accessQuery = (publicId: string) =>
  queryOptions<ReportAccessView>({
    queryKey: ['report-page', publicId, 'access'],
    queryFn: () => cookieCall({ route: routes.access, params: { publicId } }),
    retry: false,
  });

export const requestCode = (input: { publicId: string; to: ReportCodeTarget }) =>
  cookieCall({ route: routes.code, params: { publicId: input.publicId }, body: { to: input.to } });

export const verifyCode = (input: { publicId: string; code: string }) =>
  cookieCall({
    route: routes.verify,
    params: { publicId: input.publicId },
    body: { code: input.code },
  });

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
