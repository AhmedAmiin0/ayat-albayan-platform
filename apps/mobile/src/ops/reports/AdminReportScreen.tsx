import type { ReportView } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { ErrorLine } from '@/core/ui/feedback/ErrorLine';
import { apiFetch } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { pathKey } from '@/core/lib/query/query-keys';
import { Note } from '@/core/ui/feedback/Note';
import { Button } from '@/core/ui/primitives/Button';
import { ErrorState } from '@/core/ui/feedback/ErrorState';
import { Screen } from '@/core/ui/layout/Screen';
import { ScreenHeader } from '@/core/ui/layout/ScreenHeader';
import { openSigned } from '@/teacher/report/hooks/api';
import { StatusChip } from '@/core/ui/feedback/StatusChip';
import { ReportFieldRow } from './ReportFieldRow';
import { adminReportFields } from './report-v2-fields';

const back = () => (router.canGoBack() ? router.back() : router.replace('/students'));

/** One lesson report, read-only, from GET /reports/:id (admin may read any); its PDF opens when ready. */
export function AdminReportScreen() {
  const { reportId = '' } = useLocalSearchParams<{ reportId: string }>();
  const path = `/reports/${reportId}`;
  const query = useQuery({ queryKey: pathKey(path), queryFn: () => apiFetch<ReportView>(path) });
  const [pdfFailed, setPdfFailed] = useState(false);
  const report = query.data;
  return (
    <Screen>
      <ScreenHeader
        title={t.mobileAdmin.reports.detailTitle}
        subtitle={report ? t.reports.version.replace('{n}', String(report.version)) : undefined}
        trailing={<Button variant="ghost" label={t.common.back} onPress={back} />}
      />
      {!report && query.isError ? <ErrorState onRetry={() => void query.refetch()} /> : null}
      {report ? (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 14, paddingBottom: 32 }}>
          {report.form_version === 2 ? (
            <View style={{ alignItems: 'flex-start' }}>
              <StatusChip tone="neutral" glyph="hollow" label={t.reports.v2.admin.v2Badge} />
            </View>
          ) : null}
          {adminReportFields(report).map((f) => (
            <ReportFieldRow key={f.key} field={f} />
          ))}
          {report.pdf_status === 'ready' ? (
            <View style={{ gap: 8 }}>
              <Button
                variant="secondary"
                label={t.reports.downloadPdf}
                onPress={() =>
                  void openSigned(`/reports/${report.id}/pdf`).catch(() => setPdfFailed(true))
                }
              />
              {pdfFailed ? <ErrorLine message={t.reports.error.pdf_not_ready} /> : null}
            </View>
          ) : (
            <Note>{`${t.reports.pdfLabel}: ${t.enums.pdfStatus[report.pdf_status ?? 'pending']}`}</Note>
          )}
        </ScrollView>
      ) : null}
    </Screen>
  );
}
