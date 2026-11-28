import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking } from 'react-native';
import { reportRoutes } from '@ab/shared';
import { reports } from '@/ops/reports/report-calls';
import type { AdminReportScreenState } from './AdminReportScreen.types';

async function openPdfOf(id: string): Promise<void> {
  const { url } = await reports.pdf({ id });
  await Linking.openURL(url);
}

/** One report from GET /reports/:id (admin may read any) and its PDF through a signed link. */
export function useAdminReportScreen(): AdminReportScreenState {
  const { reportId } = useLocalSearchParams<{ reportId: string }>();
  const query = useQuery({
    queryKey: reportRoutes.get.key.of({ id: reportId }),
    queryFn: () => reports.get({ id: reportId }),
  });
  const [pdfFailed, setPdfFailed] = useState(false);
  return {
    report: query.data,
    failed: !query.data && query.isError,
    retry: () => void query.refetch(),
    pdfFailed,
    openPdf: (id) => void openPdfOf(id).catch(() => setPdfFailed(true)),
  };
}
