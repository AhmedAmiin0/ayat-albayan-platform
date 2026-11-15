import { isNewReport } from '@ab/client-core';
import type { PortalHistoryRow, PortalStudent } from '@ab/shared';
import { View } from 'react-native';
import { AppText, raisedCard, t, type, useTheme } from '@ab/mobile-kit';
import { DateTile, dayTile, NewMark, rangeText, teacherText } from '@/lessons';
import { openReport, PressCard } from '@/nav';
import { useFamilyClock, useSeenReports } from '@/portal';

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
  const body = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <DateTile {...dayTile(new Date(row.starts_at), clock)} />
      <View style={{ flex: 1, gap: 2 }}>
        <AppText style={{ fontFamily: type.ui[600], color: color.ink }}>{headline(row)}</AppText>
        <AppText style={{ fontSize: type.size.xs, color: color.ink2 }}>
          {`${rangeText(row, clock)} · ${teacherText(row.teacher)}`}
        </AppText>
        {pending ? (
          <AppText style={{ fontSize: type.size['2xs'], color: color.ink3 }}>
            {t.portal.app.history.reportPending}
          </AppText>
        ) : null}
        {row.recording_id ? (
          <AppText style={{ fontSize: type.size['2xs'], color: color.lapis }}>
            {t.portal.app.history.recording}
          </AppText>
        ) : null}
      </View>
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
