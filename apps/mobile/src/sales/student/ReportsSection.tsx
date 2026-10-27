import { RIYADH_TZ, type SalesStudentDetails } from '@ab/shared';
import { useState } from 'react';
import { View } from 'react-native';
import { ErrorLine } from '@/inbox';
import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/more';
import { SmallHeading as SectionLabel } from '../components/SmallHeading';
import { ReportHistoryRow } from '@/teacher';
import { fill } from '../lib/sales-text';
import { openStudentReportPdf } from './student-api';

/**
 * «التقارير»: the student's sent reports exactly as the teacher's «سجل التقارير» lists them (date,
 * lesson number, grade, «تحميل PDF» once ready), read-only: a row opens nothing else.
 */
export function ReportsSection({ studentId, reports }: { studentId: string; reports: SalesStudentDetails['reports'] }) {
  const [error, setError] = useState(false);
  const s = t.sales.student;
  return (
    <View style={{ gap: 4 }}>
      <SectionLabel>{s.reports}</SectionLabel>
      {reports.total > 0 ? <Note>{fill(s.reportsCount, { n: String(reports.total) })}</Note> : null}
      {error ? <ErrorLine message={t.reports.error.pdf_not_ready} /> : null}
      {reports.items.length === 0 ? <Note>{t.reports.noReports}</Note> : null}
      <View style={{ marginHorizontal: -16 }}>
        {reports.items.map((row) => (
          <ReportHistoryRow
            key={row.id}
            row={row}
            tz={RIYADH_TZ}
            onPdf={() => void openStudentReportPdf(studentId, row.id).catch(() => setError(true))}
          />
        ))}
      </View>
    </View>
  );
}
