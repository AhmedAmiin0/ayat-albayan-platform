import { reportPageCalls } from '@ab/client-core';
import { useQuery } from '@tanstack/react-query';
import { Linking } from 'react-native';
import { apiFetch, apiSend, pathKey } from '@ab/mobile-kit';

const pages = reportPageCalls({ apiFetch, apiSend });

/** Which page: a link's public id (ayatalbayan://report/<id>), or a list's report uuid. */
interface PageParams {
  publicId?: string;
  reportId?: string;
}

/** The query key keeps the API path of a report's live page. */
const reportPagePath = ({ publicId, reportId = '' }: PageParams): string =>
  publicId ? `/report-pages/${publicId}` : `/report-pages/by-report/${reportId}`;

const readPage = ({ publicId, reportId = '' }: PageParams) =>
  publicId ? pages.byPublicId({ publicId }) : pages.byReportId({ id: reportId });

/**
 * The report's live page, read-only: the saved report, the teacher's files and
 * the PDF, each a 1 h signed URL. Readers only (admin, the teacher, the owning assistant); anyone
 * else gets 404.
 */
export function useReportPage(params: PageParams) {
  const path = reportPagePath(params);
  return useQuery({
    queryKey: pathKey(path),
    queryFn: () => readPage(params),
    enabled: Boolean(params.publicId ?? params.reportId),
    retry: false,
  });
}

/** A file or the PDF opens in the browser through its signed URL. */
export const openUrl = (url: string): Promise<void> => Linking.openURL(url);
