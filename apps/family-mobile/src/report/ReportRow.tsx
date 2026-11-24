import { dayTile, isNewReport, reportAt } from '@ab/client-core';
import type { PortalReport, PortalStudent } from '@ab/shared';
import { View } from 'react-native';
import { t, } from '@ab/mobile-kit';
import { DateTile, NewMark, PressCard, RowText } from '@/ui';
import { teacherText } from '@/lessons';
import { openReport } from '@/nav';
import { useFamilyClock, useSeenReports } from '@/portal';

interface ReportRowProps {
  report: PortalReport;
  student: PortalStudent;
}

export function ReportRow({ report, student }: ReportRowProps) {
  const clock = { ...useFamilyClock(), tz: student.tz };
  const fresh = isNewReport(report.id, useSeenReports());
  const link = { studentId: student.id, reportId: report.id, recordingId: report.recording_id };
  return (
    <PressCard label={t.portal.openReport} onPress={() => openReport(link)}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <DateTile {...dayTile(new Date(reportAt(report)), clock)} />
        <RowText
          title={t.portal.reportTitle}
          line={report.teacher && teacherText(report.teacher)}
          notes={
            report.recording_id ? [{ text: t.portal.app.history.recording, tone: 'link' }] : []
          }
        />
        {fresh ? <NewMark /> : null}
      </View>
    </PressCard>
  );
}
