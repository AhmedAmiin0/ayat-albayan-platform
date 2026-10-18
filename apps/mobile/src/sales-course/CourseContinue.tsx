import type { BookedCourse } from '@ab/shared';
import { View } from 'react-native';
import { t } from '@/lib/i18n';
import { localDay } from '@/payments/format';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';
import { type, useTheme } from '@/theme';
import { daysText } from './course-days';

export interface CourseContinueProps {
  /** The latest course of the student's earlier subscription. */
  previous: BookedCourse;
  /** The first local day the new course may start (courseOpensOn). */
  opensOn: string;
  /** The previous teacher is no longer bookable: said so, «تابِع بنفس الأيام» disabled. */
  unavailable: boolean;
  /** «تابِع بنفس الأيام»: the same teacher, days and times, prefilled. */
  onSame: () => void;
  /** «اختر أيامًا أخرى»: the teacher, then the days, as for a first course. */
  onOther: () => void;
  /** «سجّل التحويل البنكي»: the days later, the transfer now (from «احفظ الاشتراك»). */
  transfer?: (() => void) | undefined;
}

/** A renewal's first step (owner 2026-10-18): the previous course's days, offered again from opensOn. */
export function CourseContinue({ previous, opensOn, unavailable, onSame, onOther, transfer }: CourseContinueProps) {
  const { color } = useTheme();
  const hint = t.booking.courseChange.continueHint
    .replace('{days}', daysText(previous.days, previous.tz))
    .replace('{date}', localDay(opensOn));
  const text = { fontFamily: type.ui[500], fontSize: type.size.body, lineHeight: type.lineHeight(type.size.body), color: color.ink };
  return (
    <View style={{ gap: 12 }}>
      {transfer ? <Button variant="secondary" label={t.salesMoney.stepTransfer} onPress={transfer} /> : null}
      <AppText style={text}>{hint}</AppText>
      {unavailable ? (
        <AppText accessibilityRole="alert" style={{ ...text, fontSize: type.size.sm, color: color.bad }}>
          {t.booking.courseChange.teacherUnavailable}
        </AppText>
      ) : null}
      <Button label={t.booking.courseChange.continueSameDays} disabled={unavailable} onPress={onSame} />
      <Button variant="secondary" label={t.booking.courseChange.pickOtherDays} onPress={onOther} />
    </View>
  );
}
