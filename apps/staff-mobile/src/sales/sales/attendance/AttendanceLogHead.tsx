import type { StudentAttendanceTable } from '@ab/shared';
import { View } from 'react-native';
import { zoneNote } from '@/core/lib/clock';
import { t, type, useTheme, AppText, FilterPills } from '@ab/mobile-kit';
import { Note } from '@/more';
import { useLogTz } from './AttendanceLogRow';
import { LogColumns } from './LogColumns';
import { monthOf, totalsItems } from './attendance-log-text';

interface Props {
  data: StudentAttendanceTable;
  /** The chosen month (highlighted at once, while its rows still load). */
  month: string;
  onMonth: (month: string) => void;
  /** The zone the months are bucketed in; the viewer's by default (the teacher log: hers). */
  tz?: string | undefined;
  /** The teacher's file: the wider report column (LogColumns). */
  wideReport?: boolean;
}

export function AttendanceLogHead({ data, month, onMonth, tz: zone, wideReport }: Props) {
  const tz = useLogTz(zone);
  const { color } = useTheme();
  const w = t.sales.student.log;
  return (
    <View style={{ gap: 8 }}>
      <FilterPills
        items={data.months.map((m) => ({ value: m, label: monthOf(m) }))}
        value={month}
        onChange={onMonth}
        accessibilityLabel={w.months}
      />
      <View accessibilityRole="summary" style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 12, rowGap: 4 }}>
        {totalsItems(data.totals).map((item) => (
          <AppText
            key={item.key}
            style={{
              fontFamily: type.ui[600],
              fontSize: type.size.sm,
              lineHeight: type.lineHeight(type.size.sm),
              color: color.ink,
            }}
          >
            {`${item.label} ${item.n}`}
          </AppText>
        ))}
      </View>
      <Note>{zoneNote(tz)}</Note>
      <LogColumns wideReport={wideReport} />
    </View>
  );
}
