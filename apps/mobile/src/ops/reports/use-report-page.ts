import { reportPageViewSchema, type ReportPageView } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { Linking } from 'react-native';
import { apiFetch } from '@/core/lib/http/api';
import { pathKey } from '@/core/lib/query/query-keys';

/** Which page: a link's public id (ayatalbayan://report/<id>), or a list's report uuid. */
export interface PageParams {
  publicId?: string;
  reportId?: string;
}

/** The API path of a report's live page. */
export const reportPagePath = ({ publicId, reportId = '' }: PageParams): string =>
  publicId ? `/report-pages/${publicId}` : `/report-pages/by-report/${reportId}`;

/**
 * The report's live page (owner 2026-11-06), read-only: the saved report, the teacher's files and
 * the PDF, each a 1 h signed URL. Readers only (admin, the teacher, the owning assistant); anyone
 * else gets 404. The answer is parsed with the shared schema (rule 12).
 */
export function useReportPage(params: PageParams) {
  const path = reportPagePath(params);
  return useQuery<ReportPageView>({
    queryKey: pathKey(path),
    queryFn: async () => reportPageViewSchema.parse(await apiFetch(path)),
    enabled: Boolean(params.publicId ?? params.reportId),
    retry: false,
  });
}

/** A file or the PDF opens in the browser through its signed URL. */
export const openUrl = (url: string): Promise<void> => Linking.openURL(url);
