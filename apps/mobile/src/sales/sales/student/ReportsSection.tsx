import type { SalesStudentDetails } from '@ab/shared';
import { useViewerTz } from '@/core/lib/clock';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { ApiError } from '@/core/lib/http/api';
import { ErrorLine } from '@/inbox';
import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/more';
import { SmallHeading as SectionLabel } from '@/sales/sales/components/SmallHeading';
import { ReportHistoryRow } from '@/teacher';
import { fill } from '@/sales/sales/lib/sales-text';
import { openStudentReportPdf } from './student-api';
import { InsetGroup } from '@/core/ui/surface/inset';

/** 409 pdf_not_ready says so; anything else (offline, gone) the general error. */
const pdfError = (e: unknown): string =>
  e instanceof ApiError && e.status === 409 ? t.reports.error.pdf_not_ready : t.common.error;

/**
 * «التقارير»: the student's sent reports exactly as the teacher's «سجل التقارير» lists them (date,
 * lesson number, grade, «تحميل PDF» once ready). A row opens the report read-only (owner
 * 2026-11-06): the API shows it to the student's owning assistant only (404 for another one).
 */
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
            onPdf={() => void openStudentReportPdf(studentId, row.id).catch((e: unknown) => setError(pdfError(e)))}
            onPress={() => router.push(`/sales/students/report/${row.id}`)}
          />
        ))}
      </InsetGroup>
    </View>
  );
}
