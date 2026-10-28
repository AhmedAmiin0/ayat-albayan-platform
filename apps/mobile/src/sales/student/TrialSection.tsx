import { RIYADH_TZ, type SalesTrialLesson } from '@ab/shared';
import { View } from 'react-native';
import { useClockCycle, whenIn } from '@/core/lib/clock';
import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/more';
import { trialOutcomeStyle } from '@/trial-date';
import { type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { StatusChip } from '@/core/ui/feedback/StatusChip';
import { SmallHeading } from '../components/SmallHeading';
import { fill } from '../lib/sales-text';

/**
 * «الحلقة التجريبية» (owner 2026-10-28): one compact line per trial date, newest first — when (Riyadh),
 * the teacher and the outcome chip of «مواعيد الحلقة التجريبية» (حضر / غاب / أُلغيت / قادمة / نُقلت…).
 * An old cache without it shows nothing.
 */
export function TrialSection({ trial }: { trial: readonly SalesTrialLesson[] | undefined }) {
  const { color } = useTheme();
  const cycle = useClockCycle();
  if (!trial) return null;
  const s = t.sales.student.trial;
  const text = { fontFamily: type.ui[500], fontSize: type.size.sm, lineHeight: type.lineHeight(type.size.sm), color: color.ink };
  return (
    <View style={{ gap: 8 }}>
      <SmallHeading header>{s.title}</SmallHeading>
      {trial.length === 0 ? <Note>{s.none}</Note> : null}
      {trial.map((l) => (
        <View key={l.lesson_id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 36, borderBottomWidth: 1, borderBottomColor: color.rule }}>
          <View style={{ flex: 1 }}>
            <AppText style={text}>{`${whenIn(new Date(l.starts_at), RIYADH_TZ, cycle)} ${t.schedule.riyadhTime}`}</AppText>
            {l.teacher_name ? <Note>{fill(s.teacher, { name: l.teacher_name })}</Note> : null}
          </View>
          <StatusChip {...trialOutcomeStyle[l.outcome]} label={t.trialDate.outcome[l.outcome]} size="sm" />
        </View>
      ))}
    </View>
  );
}
