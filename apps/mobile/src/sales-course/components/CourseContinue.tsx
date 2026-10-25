import { counted, type BookedCourse } from '@ab/shared';
import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { localDay } from '@/payments/format';
import { AppText } from '@/core/ui/primitives/AppText';
import { Button } from '@/core/ui/primitives/Button';
import { ErrorState } from '@/core/ui/feedback/ErrorState';
import { type, useTheme } from '@/theme';
import { daysText } from '../lib/course-days';
import type { KnownTeacher } from '../hooks/use-known-teacher';

export interface CourseContinueProps {
  /** The latest course of the student's earlier subscription. */
  previous: BookedCourse;
  /** The first local day the new course may start (courseOpensOn). */
  opensOn: string;
  /**
   * The previous teacher (known): «تابِع» is enabled only once she is bookable; busy while her list loads,
   * the error with a retry when it failed, unavailable says why not.
   */
  teacher: Pick<KnownTeacher, 'bookable' | 'pending' | 'failed' | 'unavailable' | 'refetch'>;
  /** The new plan's days a week when it differs from the previous course's (!continueFits), else null. */
  adjustTo: number | null;
  /** «تابِع بنفس الأيام» (or «عدّل الأيام السابقة» with adjustTo): the same teacher, days and times, prefilled. */
  onSame: () => void;
  /** «اختر أيامًا أخرى»: the teacher, then the days, empty, as for a first course. */
  onOther: () => void;
  /** «سجّل التحويل البنكي»: the days later, the transfer now (from «احفظ الاشتراك»). */
  transfer?: (() => void) | undefined;
}

/**
 * A renewal's first step (owner 2026-10-18): the previous course's days, offered again from opensOn;
 * with another day count than before (adjustTo), said so and «عدّل الأيام السابقة» to bring them to that count.
 */
export function CourseContinue(props: CourseContinueProps) {
  const { previous, opensOn, teacher, adjustTo, onSame, onOther, transfer } = props;
  const { color } = useTheme();
  const texts = t.booking.courseChange;
  const days = daysText(previous.days, previous.tz);
  const hint =
    adjustTo === null
      ? texts.continueHint.replace('{days}', days).replace('{date}', localDay(opensOn))
      : counted(texts.continueAdjust, adjustTo).replace('{days}', days);
  const text = { fontFamily: type.ui[500], fontSize: type.size.body, lineHeight: type.lineHeight(type.size.body), color: color.ink };
  return (
    <View style={{ gap: 12 }}>
      {transfer ? <Button variant="secondary" label={t.salesMoney.stepTransfer} onPress={transfer} /> : null}
      <AppText style={text}>{hint}</AppText>
      {teacher.unavailable ? (
        <AppText accessibilityRole="alert" style={{ ...text, fontSize: type.size.sm, color: color.bad }}>
          {t.booking.courseChange.teacherUnavailable}
        </AppText>
      ) : null}
      {teacher.failed ? <ErrorState message={t.common.error} onRetry={teacher.refetch} /> : null}
      <Button
        label={adjustTo === null ? texts.continueSameDays : texts.adjustDays}
        busy={teacher.pending}
        disabled={!teacher.bookable}
        onPress={onSame}
      />
      <Button variant="secondary" label={t.booking.courseChange.pickOtherDays} onPress={onOther} />
    </View>
  );
}
