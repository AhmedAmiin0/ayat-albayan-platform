import { RIYADH_TZ, type SalesStudentDetails } from '@ab/shared';
import { router } from 'expo-router';
import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { useClockCycle, whenIn } from '@/core/lib/clock';
import { Note } from '@/more';
import { type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { Button } from '@/core/ui/primitives/Button';
import { StatusChip } from '@/core/ui/feedback/StatusChip';
import { SmallHeading as SectionLabel } from '../components/SmallHeading';
import { ATTENDANCE_STYLE, totalsLines } from './attendance-text';

interface AttendanceSectionProps {
  studentId: string;
  attendance: SalesStudentDetails['attendance'];
}

/**
 * «الحضور»: the totals, then one line per past lesson (Riyadh time) with «حضر» / «غاب» / … newest first;
 * «عرض سجل الحضور» opens the month-by-month table (owner 2026-10-28).
 */
export function AttendanceSection({ studentId, attendance }: AttendanceSectionProps) {
  const { color } = useTheme();
  const cycle = useClockCycle();
  const s = t.sales.student;
  const text = { flex: 1, fontFamily: type.ui[500], fontSize: type.size.sm, lineHeight: type.lineHeight(type.size.sm), color: color.ink };
  return (
    <View style={{ gap: 8 }}>
      <SectionLabel>{s.attendance}</SectionLabel>
      <Button variant="secondary" label={s.log.open} onPress={() => router.push(`/sales/students/${studentId}/attendance`)} />
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
              <AppText style={text}>{whenIn(new Date(day.starts_at), RIYADH_TZ, cycle)}</AppText>
              <StatusChip {...ATTENDANCE_STYLE[day.kind]} label={s.kind[day.kind]} size="sm" />
            </View>
          ))}
        </>
      )}
    </View>
  );
}
