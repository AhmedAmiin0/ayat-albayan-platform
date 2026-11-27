import { isNewReport } from '@ab/client-core';
import { t } from '@ab/mobile-kit';
import type { RowNote } from '@/ui';
import { openReport } from '@/nav';
import { useFamilyClock, useSeenReports } from '@/portal';
import { headline } from './history-row.helpers';
import type { HistoryRowProps } from './HistoryRow.types';

export function useHistoryRow({ row, student }: HistoryRowProps) {
  const clock = { ...useFamilyClock(), tz: student.tz };
  const seen = useSeenReports();
  const fresh = row.report_id !== null && isNewReport(row.report_id, seen);
  const pending = row.outcome === 'attended' && row.report_id === null;
  const notes: RowNote[] = [
    ...(pending ? [{ text: t.portal.app.history.reportPending, tone: 'quiet' as const }] : []),
    ...(row.recording_id ? [{ text: t.portal.app.history.recording, tone: 'link' as const }] : []),
  ];
  const reportId = row.report_id;
  const link = { studentId: student.id, recordingId: row.recording_id };
  const open = reportId ? () => openReport({ ...link, reportId }) : null;
  return { clock, fresh, notes, open, title: headline(row) };
}
