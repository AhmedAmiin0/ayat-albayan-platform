import { reportStatusStyle } from '@ab/shared';
import { StatusChip } from '@/components/ui/display/status-chip';
import { t } from '@/lib/i18n/i18n';
import type { BoardRow } from '@/features/teaching/teacher-board/board-rows';

/** «آخر تقرير»: the state of the newest report on a started lesson (the lesson embed's status). */
export function ReportCell({ report }: { report: BoardRow['summary']['report'] }) {
  if (!report) return <span className="text-ink-3">{t.teacherBoard.noReport}</span>;
  return (
    <StatusChip
      size="sm"
      {...reportStatusStyle[report.status]}
      label={t.enums.reportStatus[report.status]}
    />
  );
}
