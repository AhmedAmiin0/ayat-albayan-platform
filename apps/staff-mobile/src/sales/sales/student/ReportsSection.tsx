import type { SalesStudentDetails } from '@ab/shared';
import { useViewerTz } from '@/core/lib/clock';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { ApiError, t, InsetGroup, ErrorLine } from '@ab/mobile-kit';
import { Note } from '@/more';
import { SmallHeading as SectionLabel } from '@/sales/sales/components/SmallHeading';
import { ReportHistoryRow } from '@/core/ui/lists/ReportRows';
import { fill } from '@/sales/sales/lib/sales-text';
import { openStudentReportPdf } from './student-api';

/** 409 pdf_not_ready says so; anything else (offline, gone) the general error. */
const pdfError = (e: unknown): string =>
  e instanceof ApiError && e.status === 409 ? t.reports.error.pdf_not_ready : t.common.error;

/** Opens the report read-only; the API shows it only to the owning assistant. */
export function ReportsSection({ studentId, reports }: { studentId: string; reports: SalesStudentDetails['reports'] }) {
  const tz = useViewerTz();
  const [error, setError] = useState<string | null>(null);
  const s = t.sales.student;
  return (
    <View style={{ gap: 4 }}>
      <SectionLabel>{s.reports}</SectionLabel>
      {reports.total > 0 ? <Note>{fill(s.reportsCount, { n: String(reports.total) })}</Note> : null}
      {error ? <ErrorLine message={error} /> : null}
      {reports.items.length === 0 ? <Note>{t.reports.noReports}</Note> : null}
      <InsetGroup>
        {reports.items.map((row) => (
          <ReportHistoryRow
            key={row.id}
            row={row}
            tz={tz}
            onPdf={() =>
              void openStudentReportPdf(studentId, row.id).catch((e: unknown) =>
                setError(pdfError(e)),
              )
            }
            onPress={() => router.push(`/sales/students/report/${row.id}`)}
          />
        ))}
      </InsetGroup>
    </View>
  );
}
