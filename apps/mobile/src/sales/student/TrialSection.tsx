import { canPickTrialDate, RIYADH_TZ, type SalesStudentDetails, type SalesTrialLesson, type TrialOutcome } from '@ab/shared';
import { router } from 'expo-router';
import { View } from 'react-native';
import { useHolds } from '@/auth';
import { useClockCycle, whenIn } from '@/core/lib/clock';
import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/more';
import { inTree, useTreeBase } from '@/core/nav/tree-base';
import { Button } from '@/core/ui/primitives/Button';
import { chatTrialHref, trialOutcomeStyle } from '@/trial-date';
import { type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { StatusChip } from '@/core/ui/feedback/StatusChip';
import { SmallHeading } from '../components/SmallHeading';
import { fill } from '../lib/sales-text';

type TrialStudent = Pick<SalesStudentDetails['student'], 'id' | 'name' | 'status' | 'program'>;

/** The latest trial's outcomes that leave the family without a trial: a new date is offered. */
const MISSED: readonly TrialOutcome[] = ['absent', 'cancelled'];

/**
 * «الحلقة التجريبية» (owner 2026-10-28): one compact line per trial date, newest first — when (Riyadh),
 * the teacher and the outcome chip of «مواعيد الحلقة التجريبية» (حضر / غاب / أُلغيت / قادمة / نُقلت…).
 * An old cache without it shows nothing. When the latest one was missed (غاب) or cancelled, «موعد تجريبي
 * جديد» opens the chat's trial-date screen for her student (UX review #15; the chat pill's gate:
 * self.sales_money and no running subscription). `student`: hers, else null (no action).
 */
export function TrialSection({ trial, student }: { trial: readonly SalesTrialLesson[] | undefined; student: TrialStudent | null }) {
  const { color } = useTheme();
  const cycle = useClockCycle();
  const allowed = useHolds('self.sales_money');
  const base = useTreeBase();
  if (!trial) return null;
  const again = allowed && student !== null && canPickTrialDate(student.status) && MISSED.includes(trial[0]?.outcome ?? 'upcoming');
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
      {again && student ? (
        <Button
          variant="secondary"
          label={t.trialDate.action}
          accessibilityLabel={fill(s.again, { name: student.name })}
          onPress={() => router.push(inTree(base, chatTrialHref({ studentId: student.id, name: student.name, program: student.program })))}
        />
      ) : null}
    </View>
  );
}
