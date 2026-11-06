import { reportPageViewSchema, type ReportPageView } from '@ab/shared';
import { queryOptions } from '@tanstack/react-query';
import { apiFetch } from '@/lib/http/api';

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
