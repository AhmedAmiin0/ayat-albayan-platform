import type { StudentAttendanceTable } from '@ab/shared';
import { View } from 'react-native';
import { useViewerTz, zoneNote } from '@/core/lib/clock';
import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/more';
import { type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { FilterPills } from '@/core/ui/form/FilterPills';
import { COLUMNS, ROW_LINE } from './AttendanceLogRow';
import { monthOf, totalsItems } from './attendance-log-text';

interface AttendanceLogHeadProps {
  data: StudentAttendanceTable;
  /** The chosen month (highlighted at once, while its rows still load). */
  month: string;
  onMonth: (month: string) => void;
}

/**
 * Above the rows, fixed while they scroll: the month pills (newest first), the month's totals
 * «حضر · غاب · بعذر · متأخر · ألغيت · أُجّلت», then the table's column header.
 */
export function AttendanceLogHead({ data, month, onMonth }: AttendanceLogHeadProps) {
  const { color } = useTheme();
  const w = t.sales.student.log;
  const head = { fontFamily: type.ui[600], fontSize: type.size['2xs'], lineHeight: type.lineHeight(type.size['2xs']), color: color.ink2 };
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
      <Note>{zoneNote(useViewerTz())}</Note>
      <View
        accessibilityRole="header"
        style={[ROW_LINE, { marginHorizontal: -16, paddingHorizontal: 16, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: color.ruleStrong }]}
      >
        <AppText style={[head, COLUMNS.date]}>{w.columns.date}</AppText>
        <AppText style={[head, COLUMNS.time]}>{w.columns.time}</AppText>
        <AppText style={[head, COLUMNS.teacher]}>{w.columns.teacher}</AppText>
        <AppText style={[head, COLUMNS.status]}>{w.columns.status}</AppText>
        <AppText style={[head, COLUMNS.report]}>{w.columns.report}</AppText>
      </View>
    </View>
  );
}
