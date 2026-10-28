import { ATTENDANCES, PROGRAMS } from '@ab/shared';
import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { Section } from '@/more';
import type { V2EntryState } from '../hooks/use-v2-entry';
import { Pills } from '../ui/Pills';

/** «الحضور» (a 2×2 grid) and «البرنامج» (three equal buttons), the first two questions. */
export function AttendanceProgram({ s }: { s: V2EntryState }) {
  const v2 = t.reports.v2;
  const attendances = ATTENDANCES.map((a) => ({ value: a, label: v2.attendance[a] }));
  const programs = PROGRAMS.map((p) => ({ value: p, label: t.enums.program[p] }));
  return (
    <View style={{ gap: 14 }}>
      <Section title={v2.attendanceTitle}>
        <Pills
          label={v2.attendanceTitle}
          layout="grid"
          items={attendances}
          isOn={(a) => a === s.values.attendance}
          onPress={(attendance) => s.update({ attendance })}
          disabled={s.locked}
        />
      </Section>
      <Section title={v2.programTitle}>
        <Pills
          label={v2.programTitle}
          layout="row"
          items={programs}
          isOn={(p) => p === s.values.program}
          onPress={(program) => s.update({ program })}
          disabled={s.locked}
        />
      </Section>
    </View>
  );
}
