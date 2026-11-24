import type { AttendanceTableRow } from '@ab/shared';
import type { ClockCycle } from '@ab/time';
import { View } from 'react-native';
import { t, InsetGroup } from '@ab/mobile-kit';
import { Note } from '@/core/ui/feedback/Note';
import { SectionLabel } from '@/core/ui/surface/SectionLabel';
import { AttendanceLogRow, LogColumns } from '@/sales/sales';

interface UpcomingLessonsProps {
  rows: AttendanceTableRow[];
  tz: string;
  cycle: ClockCycle;
}

/** Not pressable, since no report is due yet (docs/47). */
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
