import { portalQueries } from '@ab/client-core';
import { reportPageViewSchema, type ReportPageView } from '@ab/shared';
import { queryOptions } from '@tanstack/react-query';
import { apiFetch, apiSend } from '#/lib/http/index.ts';

/** TanStack key of a report's live page. */
export const reportPageKey = (publicId: string) => ['report-page', publicId] as const;

/**
 * GET /report-pages/:publicId with the browser's session (owner 2026-11-06): the report's readers
 * only (admin, the teacher, the family, the owning assistant); 401 / 404 for anyone else. Parsed
 * with the shared schema (rule 12).
 */
export const reportPageQuery = (publicId: string) =>
  queryOptions<ReportPageView>({
    queryKey: reportPageKey(publicId),
    queryFn: async () => reportPageViewSchema.parse(await apiFetch(`/report-pages/${publicId}`)),
    retry: false,
  });

/**
 * GET /report-pages/by-report/:reportId: the same page, opened from the lesson row of the
 * teacher's student file (docs/49) or a family's attended lesson (docs/50); shared with the apps
 * through @ab/client-core. A report the reader may not read answers 404.
 */
export const { reportPageByIdQuery } = portalQueries({ apiFetch, apiSend });
