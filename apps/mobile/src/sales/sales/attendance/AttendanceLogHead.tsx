import type { StudentAttendanceTable } from '@ab/shared';
import { View } from 'react-native';
import { zoneNote } from '@/core/lib/clock';
import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/more';
import { type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { FilterPills } from '@/core/ui/form/FilterPills';
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

/**
 * Above the rows, fixed while they scroll: the month pills (newest first), the month's totals
 * «حضر · غاب · بعذر · متأخر · ألغيت · أُجّلت», then the table's column header.
 */
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
          <AppText key={item.key} style={{ fontFamily: type.ui[600], fontSize: type.size.sm, lineHeight: type.lineHeight(type.size.sm), color: color.ink }}>
            {`${item.label} ${item.n}`}
          </AppText>
        ))}
      </View>
      <Note>{zoneNote(tz)}</Note>
      <LogColumns wideReport={wideReport} />
    </View>
  );
}
