import type { SalesStudentSchedule } from '@ab/shared';
import { View } from 'react-native';
import { useClockCycle } from '@/core/lib/clock';
import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/more';
import { type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { SmallHeading as SectionLabel } from '../components/SmallHeading';
import { slotMeta, studentLine, weeklyLine } from './schedule-text';
import { UpcomingLessons } from './UpcomingLessons';

/**
 * «الجدول» (owner 2026-10-27: «As an assistant i want to see the student schedule»): each weekly slot
 * in one short line (Riyadh, the phone's 12 / 24 h) with the student's own clock when it differs, then
 * the next lessons. No link: the API never sends one here. An old cache without it shows nothing.
 */
export function ScheduleSection({ schedule }: { schedule: SalesStudentSchedule | undefined }) {
  const { color } = useTheme();
  const cycle = useClockCycle();
  if (!schedule) return null;
  const s = t.sales.student.schedule;
  const line = { fontFamily: type.ui[600], fontSize: type.size.sm, lineHeight: type.lineHeight(type.size.sm), color: color.ink };
  return (
    <View style={{ gap: 8 }}>
      <SectionLabel>{s.title}</SectionLabel>
      {schedule.weekly.length === 0 ? <Note>{s.noWeekly}</Note> : null}
      {schedule.weekly.map((slot) => {
        const local = studentLine(slot, cycle);
        return (
          <View key={slot.rule_id} style={{ gap: 2 }}>
            <AppText style={line}>{weeklyLine(slot, cycle)}</AppText>
            <Note>{slotMeta(slot)}</Note>
            {local ? <Note>{local}</Note> : null}
          </View>
        );
      })}
      <UpcomingLessons lessons={schedule.upcoming} />
    </View>
  );
}
