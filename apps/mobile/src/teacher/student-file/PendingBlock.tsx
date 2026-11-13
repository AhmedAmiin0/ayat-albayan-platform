import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { PendingReportRow } from '@/core/ui/lists/ReportRows';
import { InsetGroup } from '@/core/ui/surface/inset';
import { SectionLabel } from '@/core/ui/surface/SectionLabel';
import { usePendingReports } from '@/teacher/lib/queries';

interface PendingBlockProps {
  studentId: string;
  /** Her zone: the lessons' day and time. */
  tz: string;
}

/**
 * At the top of the file (docs/47): this student's started lessons still missing a sent report,
 * each opening its form. Nothing when none is pending (the log still offers «اكتب التقرير»).
 */
export function PendingBlock({ studentId, tz }: PendingBlockProps) {
  const pending = usePendingReports();
  const rows = (pending.data ?? []).filter((r) => r.student.id === studentId);
  if (rows.length === 0) return null;
  return (
    <View style={{ gap: 6 }}>
      <SectionLabel>{t.reports.pending}</SectionLabel>
      <InsetGroup>
        {rows.map((r) => (
          <PendingReportRow key={r.lesson_id} row={r} tz={tz} />
        ))}
      </InsetGroup>
    </View>
  );
}
