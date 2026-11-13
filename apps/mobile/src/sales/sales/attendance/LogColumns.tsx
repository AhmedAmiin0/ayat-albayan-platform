import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { AppText } from '@/core/ui/primitives/AppText';
import { type, useTheme } from '@/theme';
import { COLUMNS, ROW_LINE, reportColumn } from './AttendanceLogRow';

/**
 * The table's column header: date · time · teacher · status · report, on the rows' own widths.
 * `wideReport`: the teacher's file, whose report cell holds a two-word action (docs/47).
 */
export function LogColumns({ wideReport = false }: { wideReport?: boolean }) {
  const { color } = useTheme();
  const w = t.sales.student.log.columns;
  const head = {
    fontFamily: type.ui[600],
    fontSize: type.size['2xs'],
    lineHeight: type.lineHeight(type.size['2xs']),
    color: color.ink2,
  };
  const rule = {
    marginHorizontal: -16,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: color.ruleStrong,
  };
  return (
    <View accessibilityRole="header" style={[ROW_LINE, rule]}>
      <AppText style={[head, COLUMNS.date]}>{w.date}</AppText>
      <AppText style={[head, COLUMNS.time]}>{w.time}</AppText>
      <AppText style={[head, COLUMNS.teacher]}>{w.teacher}</AppText>
      <AppText style={[head, COLUMNS.status]}>{w.status}</AppText>
      <AppText style={[head, reportColumn(wideReport)]}>{w.report}</AppText>
    </View>
  );
}
