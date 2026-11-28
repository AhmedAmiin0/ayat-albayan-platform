import { reportPageCalls } from '@ab/client-core';
import { reportPageRoutes } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { Linking } from 'react-native';
import { apiFetch, apiSend } from '@ab/mobile-kit';

const pages = reportPageCalls({ apiFetch, apiSend });

/** Which page: a link's public id (ayatalbayan://report/<id>), or a list's report uuid. */
interface PageParams {
  publicId?: string;
  reportId?: string;
}

const pageKey = ({ publicId, reportId = '' }: PageParams) =>
  publicId
    ? reportPageRoutes.byPublicId.key.of({ publicId })
    : reportPageRoutes.byReportId.key.of({ id: reportId });

const readPage = ({ publicId, reportId = '' }: PageParams) =>
  publicId ? pages.byPublicId({ publicId }) : pages.byReportId({ id: reportId });

/**
 * The report's live page, read-only: the saved report, the teacher's files and
 * the PDF, each a 1 h signed URL. Readers only (admin, the teacher, the owning assistant); anyone
 * else gets 404.
 */
export function useReportPage(params: PageParams) {
  return useQuery({
    queryKey: pageKey(params),
    queryFn: () => readPage(params),
    enabled: Boolean(params.publicId ?? params.reportId),
    retry: false,
  });
}

/** A file or the PDF opens in the browser through its signed URL. */
export const openUrl = (url: string): Promise<void> => Linking.openURL(url);
