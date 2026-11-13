import { counted } from '@ab/shared';
import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { PendingReportRow } from '@/core/ui/lists/ReportRows';
import { InsetGroup } from '@/core/ui/surface/inset';
import { SectionLabel } from '@/core/ui/surface/SectionLabel';
import { usePendingReports } from '@/teacher/lib/queries';

/** At most this many rows above the panes, so the lessons keep the screen (390pt). */
const SHOWN = 2;

interface PendingBlockProps {
  studentId: string;
  /** Her zone: the lessons' day and time. */
  tz: string;
}

/**
 * At the top of the file (docs/47): this student's started lessons still missing a sent report,
 * each opening its form; the oldest two, under «n تقارير معلّقة» (the log offers the rest as
 * «اكتب التقرير»). Nothing when none is pending.
 */
export function PendingBlock({ studentId, tz }: PendingBlockProps) {
  const pending = usePendingReports();
  const rows = (pending.data ?? []).filter((r) => r.student.id === studentId);
  if (rows.length === 0) return null;
  return (
    <View style={{ gap: 6 }}>
      <SectionLabel>{counted(t.reports.pendingCount, rows.length)}</SectionLabel>
      <InsetGroup>
        {rows.slice(0, SHOWN).map((r) => (
          <PendingReportRow key={r.lesson_id} row={r} tz={tz} />
        ))}
      </InsetGroup>
    </View>
  );
}
