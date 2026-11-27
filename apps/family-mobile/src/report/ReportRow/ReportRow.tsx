import { dayTile, reportAt } from '@ab/client-core';
import { View } from 'react-native';
import { t } from '@ab/mobile-kit';
import { DateTile, NewMark, PressCard, RowText } from '@/ui';
import { teacherText } from '@/lessons';
import { openReport } from '@/nav';
import type { ReportRowProps } from './ReportRow.types';
import { useReportRow } from './use-report-row';

export function ReportRow({ report, student }: ReportRowProps) {
  const { clock, fresh, link } = useReportRow({ report, student });
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
