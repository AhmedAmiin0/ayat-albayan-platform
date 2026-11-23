import { reportStatusStyle } from '@ab/shared';
import { StatusChip } from '@ab/web-kit/components/ui/display/status-chip';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import type { BoardRow } from '@/features/teaching/teacher-board/board-rows';

/** The newest report on a started lesson, from the lesson embed's status. */
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
