import type { PortalHistoryRow } from '@ab/shared';
import { t } from '@ab/mobile-kit';

/** The row's main line: its report, the lesson attended (report not sent yet), the absence. */
export function headline(row: PortalHistoryRow): string {
  const H = t.portal.app.history;
  const absence = row.absence_reason
    ? t.portal.absenceReason.replace('{reason}', row.absence_reason)
    : H.noReason;
  const LINE: Record<PortalHistoryRow['outcome'], () => string> = {
    attended: () => (row.report_id ? t.portal.openReport : H.attended),
    absent: () => absence,
    excused: () => (row.absence_reason ? absence : t.portal.excused),
  };
  return LINE[row.outcome]();
}
