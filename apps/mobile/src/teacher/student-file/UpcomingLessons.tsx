import type { AttendanceTableRow, ClockCycle } from '@ab/shared';
import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/core/ui/feedback/Note';
import { InsetGroup } from '@/core/ui/surface/inset';
import { SectionLabel } from '@/core/ui/surface/SectionLabel';
import { AttendanceLogRow, LogColumns } from '@/sales/sales';

interface UpcomingLessonsProps {
  rows: AttendanceTableRow[];
  tz: string;
  cycle: ClockCycle;
}

/**
 * «الحلقات القادمة خلال 14 يومًا» (docs/47): the head's `upcoming`, cancelled and moved ones with
 * their reasons, the chip by lesson status, under the log's column header. Not pressable: no
 * report is due yet.
 */
export function UpcomingLessons({ rows, tz, cycle }: UpcomingLessonsProps) {
  return (
    <View style={{ gap: 6 }}>
      <SectionLabel>{t.teacherFile.upcoming}</SectionLabel>
      {rows.length === 0 ? <Note>{t.teacherFile.noUpcoming}</Note> : <LogColumns wideReport />}
      <InsetGroup testID="upcoming-lessons">
        {rows.map((row, i) => (
          <AttendanceLogRow
            key={row.lesson_id}
            row={row}
            striped={i % 2 === 1}
            cycle={cycle}
            tz={tz}
            reportLabel={null}
          />
        ))}
      </InsetGroup>
    </View>
  );
}
