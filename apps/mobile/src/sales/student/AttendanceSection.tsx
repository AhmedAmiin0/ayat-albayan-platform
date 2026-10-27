import { lessonWhenText, RIYADH_TZ, type SalesStudentDetails } from '@ab/shared';
import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { locale } from '@/core/lib/i18n/locale';
import { Note } from '@/more';
import { type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { StatusChip } from '@/core/ui/feedback/StatusChip';
import { SmallHeading as SectionLabel } from '../components/SmallHeading';
import { ATTENDANCE_STYLE, totalsLines } from './attendance-text';

/** «الحضور»: the totals, then one line per past lesson (Riyadh time) with «حضر» / «غاب» / … newest first. */
export function AttendanceSection({ attendance }: { attendance: SalesStudentDetails['attendance'] }) {
  const { color } = useTheme();
  const s = t.sales.student;
  const text = { flex: 1, fontFamily: type.ui[500], fontSize: type.size.sm, lineHeight: type.lineHeight(type.size.sm), color: color.ink };
  return (
    <View style={{ gap: 8 }}>
      <SectionLabel>{s.attendance}</SectionLabel>
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
              <AppText style={text}>{lessonWhenText(new Date(day.starts_at), RIYADH_TZ, locale)}</AppText>
              <StatusChip {...ATTENDANCE_STYLE[day.kind]} label={s.kind[day.kind]} size="sm" />
            </View>
          ))}
        </>
      )}
    </View>
  );
}
