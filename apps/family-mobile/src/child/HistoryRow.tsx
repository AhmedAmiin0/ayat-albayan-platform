import { dayTile, isNewReport } from '@ab/client-core';
import type { PortalHistoryRow, PortalStudent } from '@ab/shared';
import { View } from 'react-native';
import { raisedCard, t, useTheme } from '@ab/mobile-kit';
import { DateTile, NewMark, PressCard, RowText, type RowNote } from '#/ui/index.ts';
import { rangeText, teacherText } from '#/lessons/index.ts';
import { openReport } from '#/nav/index.ts';
import { useFamilyClock, useSeenReports } from '#/portal/index.ts';

interface HistoryRowProps {
  row: PortalHistoryRow;
  student: PortalStudent;
}

/** The row's main line: its report, the lesson attended (report not sent yet), the absence. */
function headline(row: PortalHistoryRow): string {
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

/** One past lesson (canvas Attended / Absent): the day, the time and teacher, its report → open. */
export function HistoryRow({ row, student }: HistoryRowProps) {
  const { color } = useTheme();
  const clock = { ...useFamilyClock(), tz: student.tz };
  const seen = useSeenReports();
  const fresh = row.report_id !== null && isNewReport(row.report_id, seen);
  const pending = row.outcome === 'attended' && row.report_id === null;
  const notes: RowNote[] = [
    ...(pending ? [{ text: t.portal.app.history.reportPending, tone: 'quiet' as const }] : []),
    ...(row.recording_id ? [{ text: t.portal.app.history.recording, tone: 'link' as const }] : []),
  ];
  const body = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <DateTile {...dayTile(new Date(row.starts_at), clock)} />
      <RowText
        title={headline(row)}
        line={`${rangeText(row, clock)} · ${teacherText(row.teacher)}`}
        notes={notes}
      />
      {fresh ? <NewMark /> : null}
    </View>
  );
  const reportId = row.report_id;
  if (!reportId) return <View style={{ ...raisedCard(color, 16), padding: 16 }}>{body}</View>;
  const link = { studentId: student.id, reportId, recordingId: row.recording_id };
  return (
    <PressCard label={headline(row)} onPress={() => openReport(link)}>
      {body}
    </PressCard>
  );
}
