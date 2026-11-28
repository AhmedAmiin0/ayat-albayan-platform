import type { ReportView } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { backWithin } from '@/core/nav/back-within';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import {
  apiFetch,
  t,
  pathKey,
  Button,
  BackButton,
  ErrorState,
  Screen,
  ScreenHeader,
  StatusChip,
  ErrorLine,
} from '@ab/mobile-kit';
import { Note } from '@/core/ui/feedback/Note';
import { openSigned } from '@/core/lib/http/open-signed';
import { ReportFieldRow } from '@/ops/reports/ReportFieldRow';
import { adminReportFields } from '@/ops/reports/report-v2-fields';

const back = () => backWithin('/students');

/** A lesson report, read-only, from GET /reports/:id (admin reads any); PDF opens when ready. */
export function AdminReportScreen() {
  const { reportId = '' } = useLocalSearchParams<{ reportId?: string }>();
  const path = `/reports/${reportId}`;
  const query = useQuery({ queryKey: pathKey(path), queryFn: () => apiFetch<ReportView>(path) });
  const [pdfFailed, setPdfFailed] = useState(false);
  const report = query.data;
  return (
    <Screen>
      <ScreenHeader
        title={t.mobileAdmin.reports.detailTitle}
        subtitle={report ? t.reports.version.replace('{n}', String(report.version)) : undefined}
        leading={<BackButton onPress={back} />}
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
          <Button
            variant="secondary"
            label={t.reportPage.view}
            onPress={() => router.push(`/report/id/${report.id}`)}
          />
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
