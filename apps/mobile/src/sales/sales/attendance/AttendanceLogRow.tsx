import type { AttendanceTableRow, ClockCycle } from '@ab/shared';
import { memo } from 'react';
import { Pressable, View, type ViewStyle } from 'react-native';
import { clockIn, useViewerTz } from '@/core/lib/clock';
import { t } from '@/core/lib/i18n/i18n';
import { type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { StatusChip } from '@/core/ui/feedback/StatusChip';
import { fill } from '@/sales/sales/lib/sales-text';
import { useLessonStatusText } from '@/core/ui/feedback/lesson-status';
import {
  cancelLine,
  dayDateOf,
  moveLines,
  reportCell,
  rowChip,
  rowTags,
} from './attendance-log-text';

/** The table's columns (the header uses the same): date · time · teacher · status · report. */
export const COLUMNS: Record<'date' | 'time' | 'teacher' | 'status' | 'report', ViewStyle> = {
  date: { flex: 1.3 },
  time: { flex: 1 },
  teacher: { flex: 1.2 },
  status: { flex: 1.3, alignItems: 'flex-start' },
  report: { flex: 0.8 },
};

/** The report column; wider in the teacher's file, whose cell holds «تعديل التقرير» (docs/47). */
export const reportColumn = (wide: boolean): ViewStyle =>
  wide ? { flex: 1.5 } : COLUMNS.report;

export const ROW_LINE: ViewStyle = { flexDirection: 'row', alignItems: 'center', gap: 6 };

/** The zone a log shows in: the one given (the teacher log: hers), else the viewer's. */
export function useLogTz(zone: string | undefined): string {
  const viewer = useViewerTz();
  return zone ?? viewer;
}

interface AttendanceLogRowProps {
  row: AttendanceTableRow;
  /** Odd rows are striped. */
  striped: boolean;
  cycle: ClockCycle;
  /** The zone of the dates and times; the viewer's by default (the teacher log passes hers). */
  tz?: string | undefined;
  /** Given only when the row has a sent report (any student, owner 2026-10-30). */
  onOpen?: (row: AttendanceTableRow) => void;
  /** The teacher's file (docs/47): her action's word in the report cell; null: «—». */
  reportLabel?: string | null;
}

/** One past lesson of «سجل الحضور»: the five cells, then the trial / makeup tags and the cancel reason. */
export const AttendanceLogRow = memo(function AttendanceLogRow({ row, striped, cycle, onOpen, tz: zone, reportLabel }: AttendanceLogRowProps) {
  const { color } = useTheme();
  const tz = useLogTz(zone);
  const status = useLessonStatusText();
  const w = t.sales.student.log;
  const cell = { fontFamily: type.ui[500], fontSize: type.size.xs, lineHeight: type.lineHeight(type.size.xs), color: color.ink };
  const note = { ...cell, fontFamily: type.ui[400], color: color.ink3 };
  const tags = rowTags(row);
  const reason = cancelLine(row);
  const date = dayDateOf(row.starts_at, tz);
  const time = clockIn(new Date(row.starts_at), tz, cycle);
  const report = reportCell(row, reportLabel);
  const body = (
    <>
      <View style={ROW_LINE}>
        <AppText style={[cell, COLUMNS.date]}>{date}</AppText>
        <AppText style={[cell, COLUMNS.time]}>{time}</AppText>
        <AppText style={[cell, COLUMNS.teacher]} numberOfLines={1}>{row.teacher_name ?? '—'}</AppText>
        <View style={COLUMNS.status}>
          <StatusChip {...rowChip(row, status)} size="sm" />
        </View>
        <AppText style={[cell, reportColumn(reportLabel !== undefined), { color: report.active ? color.lapis : color.ink3 }]}>{report.text}</AppText>
      </View>
      {tags.length > 0 ? <AppText style={note}>{tags.join(' · ')}</AppText> : null}
      {reason ? <AppText style={note}>{reason}</AppText> : null}
      {moveLines(row, tz, cycle).map((line) => (
        <AppText key={line} style={note}>{line}</AppText>
      ))}
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
