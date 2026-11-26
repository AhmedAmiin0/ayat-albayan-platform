import type { SalesStudentSchedule } from '@ab/shared';
import { View } from 'react-native';
import { useClockCycle, useViewerTz } from '@/core/lib/clock';
import { t, type, useTheme, AppText } from '@ab/mobile-kit';
import { Note } from '@/more';
import { SmallHeading as SectionLabel } from '@/sales/sales/components/SmallHeading';
import { slotLines, slotMeta, weeklyLine } from './schedule-text';

/** Riyadh time plus the student's clock when it differs; the API never sends a link here. */
export function ScheduleSection({ schedule }: { schedule: SalesStudentSchedule | undefined }) {
  const { color } = useTheme();
  const cycle = useClockCycle();
  const tz = useViewerTz();
  if (!schedule) return null;
  const viewer = { tz, cycle };
  const s = t.sales.student.schedule;
  const line = {
    fontFamily: type.ui[600],
    fontSize: type.size.sm,
    lineHeight: type.lineHeight(type.size.sm),
    color: color.ink,
  };
  return (
    <View style={{ gap: 8 }}>
      <SectionLabel header>{s.title}</SectionLabel>
      {schedule.weekly.length === 0 ? <Note>{s.noWeekly}</Note> : null}
      {schedule.weekly.map((slot) => {
        // An old cache without the student's zone: the viewer's line alone until the refetch.
        const lines = schedule.student_tz
          ? slotLines(slot, schedule.student_tz, viewer)
          : { main: weeklyLine(slot, viewer), student: null };
        return (
          <View key={slot.rule_id} style={{ gap: 2 }}>
            <AppText style={line}>{lines.main}</AppText>
            <Note>{slotMeta(slot)}</Note>
            {lines.student ? <Note>{lines.student}</Note> : null}
          </View>
        );
      })}
    </View>
  );
}
