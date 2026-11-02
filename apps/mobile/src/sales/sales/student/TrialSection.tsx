import { canPickTrialDate, type SalesStudentDetails, type SalesTrialLesson, type TrialOutcome } from '@ab/shared';
import { router } from 'expo-router';
import { View } from 'react-native';
import { useHolds } from '@/core/auth';
import { useClockCycle, useViewerTz, whenIn } from '@/core/lib/clock';
import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/more';
import { inTree, useTreeBase } from '@/core/nav/tree-base';
import { Button } from '@/core/ui/primitives/Button';
import { chatTrialHref, trialOutcomeStyle } from '@/trial-date';
import { type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { StatusChip } from '@/core/ui/feedback/StatusChip';
import { SmallHeading } from '@/sales/sales/components/SmallHeading';
import { fill } from '@/sales/sales/lib/sales-text';

type TrialStudent = Pick<SalesStudentDetails['student'], 'id' | 'name' | 'status' | 'program'>;

/** The latest trial still ahead is changed (moved); otherwise a new date is booked. */
const CHANGES: Partial<Record<TrialOutcome, true>> = { upcoming: true };

/**
 * «الحلقة التجريبية» (owner 2026-10-28): one compact line per trial date, newest first — when (Riyadh),
 * the teacher and the outcome chip of «مواعيد الحلقة التجريبية» (حضر / غاب / أُلغيت / قادمة / نُقلت…).
 * An old cache without it shows nothing. For her student without a running subscription (the
 * chat pill's gate: self.sales_money) the chat's trial-date screen opens (owner 2026-11-02):
 * «تعديل الموعد التجريبي» while the latest trial is still ahead (date, time, length, teacher,
 * link), else «موعد تجريبي جديد». `student`: hers (the ownership rule), else null (no action).
 */
export function TrialSection({ trial, student }: { trial: readonly SalesTrialLesson[] | undefined; student: TrialStudent | null }) {
  const { color } = useTheme();
  const cycle = useClockCycle();
  const tz = useViewerTz();
  const allowed = useHolds('self.sales_money');
  const base = useTreeBase();
  if (!trial) return null;
  const may = allowed && student !== null && canPickTrialDate(student.status);
  const s = t.sales.student.trial;
  const changes = CHANGES[trial[0]?.outcome ?? 'moved'] === true;
  const words = changes
    ? { label: t.trialDate.editAction, a11y: s.edit }
    : { label: t.trialDate.action, a11y: s.again };
  const text = { fontFamily: type.ui[500], fontSize: type.size.sm, lineHeight: type.lineHeight(type.size.sm), color: color.ink };
  return (
    <View style={{ gap: 8 }}>
      <SmallHeading header>{s.title}</SmallHeading>
      {trial.length === 0 ? <Note>{s.none}</Note> : null}
      {trial.map((l) => (
        <View key={l.lesson_id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 36, borderBottomWidth: 1, borderBottomColor: color.rule }}>
          <View style={{ flex: 1 }}>
            <AppText style={text}>{`${whenIn(new Date(l.starts_at), tz, cycle)} ${t.schedule.viewerTime}`}</AppText>
            {l.teacher_name ? <Note>{fill(s.teacher, { name: l.teacher_name })}</Note> : null}
          </View>
          <StatusChip {...trialOutcomeStyle[l.outcome]} label={t.trialDate.outcome[l.outcome]} size="sm" />
        </View>
      ))}
      {may && student ? (
        <Button
          variant="secondary"
          label={words.label}
          accessibilityLabel={fill(words.a11y, { name: student.name })}
          onPress={() => router.push(inTree(base, chatTrialHref({ studentId: student.id, name: student.name, program: student.program })))}
        />
      ) : null}
    </View>
  );
}
