import { counted, type BookedCourse } from '@ab/shared';
import { View } from 'react-native';
import { t, AppText, Button, ErrorState, type, useTheme } from '@ab/mobile-kit';
import { localDay } from '@/core/lib/money/format';
import { daysText } from '@/sales-course/lib/course-days';
import type { KnownTeacher } from '@/sales-course/hooks/use-known-teacher';
import { useClockCycle, useViewerTz } from '@/core/lib/clock';

interface CourseContinueProps {
  /** The latest course of the student's earlier subscription. */
  previous: BookedCourse;
  /** The first local day the new course may start (courseOpensOn). */
  opensOn: string;
  /** Enabled only once the previous teacher is bookable. */
  teacher: Pick<KnownTeacher, 'bookable' | 'pending' | 'failed' | 'unavailable' | 'refetch'>;
  /** The new plan's days a week when it differs from the previous course's (!continueFits), else null. */
  adjustTo: number | null;
  onSame: () => void;
  onOther: () => void;
  saved?: boolean | undefined;
  transfer?: (() => void) | undefined;
}

/** A different day count than before offers to adjust the previous days. */
export function CourseContinue(props: CourseContinueProps) {
  const cycle = useClockCycle();
  const tz = useViewerTz();
  const viewer = { tz, cycle };
  const { previous, opensOn, teacher, adjustTo, onSame, onOther, transfer, saved } = props;
  const { color } = useTheme();
  const texts = t.booking.courseChange;
  const days = daysText(previous.days, previous.tz, viewer);
  const line = saved ? texts.draftHint : texts.continueHint;
  const same = saved ? texts.draftEdit : texts.continueSameDays;
  const hint =
    adjustTo === null
      ? line.replace('{days}', days).replace('{date}', localDay(opensOn))
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
        label={adjustTo === null ? same : texts.adjustDays}
        busy={teacher.pending}
        disabled={!teacher.bookable}
        onPress={onSame}
      />
      <Button variant="secondary" label={t.booking.courseChange.pickOtherDays} onPress={onOther} />
    </View>
  );
}
