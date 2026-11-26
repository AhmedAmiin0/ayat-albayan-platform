import type { SalesStudentDetails } from '@ab/shared';
import { router } from 'expo-router';
import { View } from 'react-native';
import { t, type, useTheme, AppText, Button, StatusChip } from '@ab/mobile-kit';
import { useClockCycle, useViewerTz, whenIn } from '@/core/lib/clock';
import { useStudentHref } from '@/core/nav/tree-base';
import { Note } from '@/more';
import { SmallHeading as SectionLabel } from '@/sales/sales/components/SmallHeading';
import { ATTENDANCE_STYLE, totalsLines } from './attendance-text';

interface AttendanceSectionProps {
  studentId: string;
  attendance: SalesStudentDetails['attendance'];
}

/** Past lessons in Riyadh time, newest first. */
export function AttendanceSection({ studentId, attendance }: AttendanceSectionProps) {
  const { color } = useTheme();
  const cycle = useClockCycle();
  const tz = useViewerTz();
  const to = useStudentHref();
  const s = t.sales.student;
  const text = {
    flex: 1,
    fontFamily: type.ui[500],
    fontSize: type.size.sm,
    lineHeight: type.lineHeight(type.size.sm),
    color: color.ink,
  };
  return (
    <View style={{ gap: 8 }}>
      <SectionLabel>{s.attendance}</SectionLabel>
      <Button variant="secondary" label={s.log.open} onPress={() => router.push(to(`/sales/students/${studentId}/attendance`))} />
      {attendance.items.length === 0 ? (
        <Note>{s.noAttendance}</Note>
      ) : (
        <>
          {totalsLines(attendance.totals).map((line) => (
            <AppText key={line} style={{ ...text, flex: undefined, fontFamily: type.ui[600] }}>
              {line}
            </AppText>
          ))}
          <Note>{s.attendanceHint}</Note>
          {attendance.items.map((day) => (
            <View
              key={day.lesson_id}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 36, borderBottomWidth: 1, borderBottomColor: color.rule }}
            >
              <AppText style={text}>{whenIn(new Date(day.starts_at), tz, cycle)}</AppText>
              <StatusChip {...ATTENDANCE_STYLE[day.kind]} label={s.kind[day.kind]} size="sm" />
            </View>
          ))}
        </>
      )}
    </View>
  );
}
