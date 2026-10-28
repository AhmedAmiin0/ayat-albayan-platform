import { RIYADH_TZ, type AttendanceTableRow, type ClockCycle } from '@ab/shared';
import { memo } from 'react';
import { Pressable, View, type ViewStyle } from 'react-native';
import { clockIn } from '@/core/lib/clock';
import { t } from '@/core/lib/i18n/i18n';
import { type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { StatusChip } from '@/core/ui/feedback/StatusChip';
import { fill } from '../lib/sales-text';
import { cancelLine, dayDateOf, rowChip, rowTags } from './attendance-log-text';

/** The table's columns (the header uses the same): date · time · teacher · status · report. */
export const COLUMNS: Record<'date' | 'time' | 'teacher' | 'status' | 'report', ViewStyle> = {
  date: { flex: 1.3 },
  time: { flex: 1 },
  teacher: { flex: 1.2 },
  status: { flex: 1.3, alignItems: 'flex-start' },
  report: { flex: 0.8 },
};

export const ROW_LINE: ViewStyle = { flexDirection: 'row', alignItems: 'center', gap: 6 };

interface AttendanceLogRowProps {
  row: AttendanceTableRow;
  /** Odd rows are striped. */
  striped: boolean;
  cycle: ClockCycle;
  /** Given only when the row's report may open (`mine` and a sent report). */
  onOpen?: (row: AttendanceTableRow) => void;
}

/** One past lesson of «سجل الحضور»: the five cells, then the trial / makeup tags and the cancel reason. */
export const AttendanceLogRow = memo(function AttendanceLogRow({ row, striped, cycle, onOpen }: AttendanceLogRowProps) {
  const { color } = useTheme();
  const w = t.sales.student.log;
  const cell = { fontFamily: type.ui[500], fontSize: type.size.xs, lineHeight: type.lineHeight(type.size.xs), color: color.ink };
  const note = { ...cell, fontFamily: type.ui[400], color: color.ink3 };
  const tags = rowTags(row);
  const reason = cancelLine(row);
  const date = dayDateOf(row.starts_at);
  const sent = row.report_sent;
  const body = (
    <>
      <View style={ROW_LINE}>
        <AppText style={[cell, COLUMNS.date]}>{date}</AppText>
        <AppText style={[cell, COLUMNS.time]}>{clockIn(new Date(row.starts_at), RIYADH_TZ, cycle)}</AppText>
        <AppText style={[cell, COLUMNS.teacher]} numberOfLines={1}>{row.teacher_name ?? '—'}</AppText>
        <View style={COLUMNS.status}>
          <StatusChip {...rowChip(row)} size="sm" />
        </View>
        <AppText style={[cell, COLUMNS.report, { color: sent ? color.lapis : color.ink3 }]}>{sent ? w.sent : w.notSent}</AppText>
      </View>
      {tags.length > 0 ? <AppText style={note}>{tags.join(' · ')}</AppText> : null}
      {reason ? <AppText style={note}>{reason}</AppText> : null}
    </>
  );
  const style = { paddingHorizontal: 16, paddingVertical: 8, gap: 2, minHeight: 44, backgroundColor: striped ? color.sunk : color.page };
  return onOpen ? (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={fill(w.openReport, { date })}
      onPress={() => onOpen(row)}
      style={({ pressed }) => [style, pressed ? { opacity: 0.7 } : null]}
    >
      {body}
    </Pressable>
  ) : (
    <View style={style}>{body}</View>
  );
});
