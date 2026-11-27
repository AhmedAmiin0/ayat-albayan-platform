import { portalQueries, reportPageCalls } from '@ab/client-core';
import { queryOptions } from '@tanstack/react-query';
import { apiFetch, apiSend } from '@ab/web-kit/lib/http/api';

const pages = reportPageCalls({ apiFetch, apiSend });

/** TanStack key of a report's live page. */
export const reportPageKey = (publicId: string) => ['report-page', publicId] as const;

/**
 * GET /report-pages/:publicId with the browser's session: the report's readers
 * only (admin, the teacher, the family, the owning assistant); 401 / 404 for anyone else.
 */
export const reportPageQuery = (publicId: string) =>
  queryOptions({
    queryKey: reportPageKey(publicId),
    queryFn: () => pages.byPublicId({ publicId }),
    retry: false,
  });

/**
 * GET /report-pages/by-report/:reportId: the same page, opened from the lesson row of the
 * teacher's student file (docs/49) or a family's attended lesson (docs/50); shared with the apps
 * through @ab/client-core. A report the reader may not read answers 404.
 */
export const { reportPageByIdQuery } = portalQueries({ apiFetch, apiSend });
