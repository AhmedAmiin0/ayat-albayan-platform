import { isNewReport, reportAt } from '@ab/client-core';
import type { PortalReport, PortalStudent } from '@ab/shared';
import { View } from 'react-native';
import { AppText, t, type, useTheme } from '@ab/mobile-kit';
import { DateTile, dayTile, NewMark, teacherText } from '@/lessons';
import { openReport, PressCard } from '@/nav';
import { useFamilyClock, useSeenReports } from '@/portal';

interface ReportRowProps {
  report: PortalReport;
  student: PortalStudent;
}

/** One sent report (canvas Reports): the lesson's day, the teacher, «جديد», the recording mark. */
export function ReportRow({ report, student }: ReportRowProps) {
  const { color } = useTheme();
  const clock = { ...useFamilyClock(), tz: student.tz };
  const fresh = isNewReport(report.id, useSeenReports());
  const link = { studentId: student.id, reportId: report.id, recordingId: report.recording_id };
  return (
    <PressCard label={t.portal.openReport} onPress={() => openReport(link)}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <DateTile {...dayTile(new Date(reportAt(report)), clock)} />
        <View style={{ flex: 1, gap: 2 }}>
          <AppText style={{ fontFamily: type.ui[600], color: color.ink }}>
            {t.portal.reportTitle}
          </AppText>
          {report.teacher ? (
            <AppText style={{ fontSize: type.size.xs, color: color.ink2 }}>
              {teacherText(report.teacher)}
            </AppText>
          ) : null}
          {report.recording_id ? (
            <AppText style={{ fontSize: type.size['2xs'], color: color.lapis }}>
              {t.portal.app.history.recording}
            </AppText>
          ) : null}
        </View>
        {fresh ? <NewMark /> : null}
      </View>
    </PressCard>
  );
}
