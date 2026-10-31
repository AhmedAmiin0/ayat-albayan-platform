import type { SalesStudentSchedule } from '@ab/shared';
import { View } from 'react-native';
import { useClockCycle, useViewerTz } from '@/core/lib/clock';
import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/more';
import { type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { SmallHeading as SectionLabel } from '../components/SmallHeading';
import { slotLines, slotMeta, weeklyLine } from './schedule-text';
import { UpcomingLessons } from './UpcomingLessons';

/**
 * «الجدول» (owner 2026-10-27: «As an assistant i want to see the student schedule»): each weekly slot
 * in one short line (Riyadh, the phone's 12 / 24 h) with the student's own clock (students.tz) when it differs, then
 * the next lessons. No link: the API never sends one here. An old cache without it shows nothing.
 */
export function ScheduleSection({ schedule, studentId }: { schedule: SalesStudentSchedule | undefined; studentId: string }) {
  const { color } = useTheme();
  const cycle = useClockCycle();
  const tz = useViewerTz();
  if (!schedule) return null;
  const viewer = { tz, cycle };
  const s = t.sales.student.schedule;
  const line = { fontFamily: type.ui[600], fontSize: type.size.sm, lineHeight: type.lineHeight(type.size.sm), color: color.ink };
  return (
    <View style={{ gap: 8 }}>
      <SectionLabel header>{s.title}</SectionLabel>
      {schedule.weekly.length === 0 ? <Note>{s.noWeekly}</Note> : null}
      {schedule.weekly.map((slot) => {
        // An old cache without the student's zone: the viewer's line alone until the refetch.
        const lines = schedule.student_tz ? slotLines(slot, schedule.student_tz, viewer) : { main: weeklyLine(slot, viewer), student: null };
        return (
          <View key={slot.rule_id} style={{ gap: 2 }}>
            <AppText style={line}>{lines.main}</AppText>
            <Note>{slotMeta(slot)}</Note>
            {lines.student ? <Note>{lines.student}</Note> : null}
          </View>
        );
      })}
      <UpcomingLessons lessons={schedule.upcoming} studentId={studentId} />
    </View>
  );
}
