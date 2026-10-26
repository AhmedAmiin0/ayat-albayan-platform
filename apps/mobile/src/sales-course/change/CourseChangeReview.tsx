import { counted, type BookedCourse, type CourseChangeRequest } from '@ab/shared';
import { View } from 'react-native';
import type { BookFailure } from '@/booking/shared/booking-errors';
import { ConflictNotice } from '@/booking/shared/ConflictNotice';
import { whenText } from '@/booking/shared/slots';
import { ErrorLine } from '@/inbox/ErrorLine';
import { t } from '@/core/lib/i18n/i18n';
import { localDay } from '@/payments/format';
import { AppText } from '@/core/ui/primitives/AppText';
import { Button } from '@/core/ui/primitives/Button';
import { type, useTheme } from '@/theme';
import { CourseCheckNotice } from '../components/CourseCheckNotice';
import { daysText, requestDays } from '../lib/course-days';
import { useCourseChangeCheck } from './change-queries';

interface CourseChangeReviewProps {
  course: BookedCourse;
  picks: readonly string[];
  /** The request «احفظ الأيام الجديدة» sends; null until a day is picked. */
  body: CourseChangeRequest | null;
  saving: { busy: boolean; failure: BookFailure | null; submit: () => void };
  onChangeSlot: () => void;
}

/**
 * The change's review: «الأيام الحالية» and «الأيام الجديدة» together, how many lessons are left
 * and the new last day (POST …/course/change/check), then the first lesson on the new days. A clash blocks the assistant (no override, owner
 * 2026-10-18): its only way out is «اختر موعدًا آخر».
 */
export function CourseChangeReview({ course, picks, body, saving, onChangeSlot }: CourseChangeReviewProps) {
  const { color } = useTheme();
  const check = useCourseChangeCheck(body);
  const need = course.perWeek ?? course.days.length;
  const clean = check.isSuccess && check.data.conflicts.length === 0;
  const ready = body !== null && picks.length === need && clean;
  const line = { fontFamily: type.ui[500], fontSize: type.size.sm, lineHeight: type.lineHeight(type.size.sm), color: color.ink };
  const texts = t.booking.courseChange;
  return (
    <View style={{ gap: 14 }}>
      <View style={{ gap: 4 }}>
        <AppText style={{ ...line, color: color.ink2 }}>{texts.currentDays.replace('{days}', daysText(course.days, course.tz))}</AppText>
        {body ? <AppText style={line}>{texts.newDays.replace('{days}', daysText(requestDays(body), course.tz))}</AppText> : null}
      </View>
      {check.isSuccess ? (
        <View style={{ gap: 4 }}>
          <AppText style={line}>{counted(texts.remaining, check.data.remaining)}</AppText>
          <AppText style={line}>{texts.newEnd.replace('{date}', localDay(check.data.endsOn))}</AppText>
        </View>
      ) : null}
      {body ? <AppText style={line}>{texts.firstNew.replace('{when}', whenText(body.startsAt, course.tz))}</AppText> : null}
      {check.isPending ? (
        <AppText style={{ ...line, color: color.ink2 }}>{texts.checking}</AppText>
      ) : (
        <CourseCheckNotice check={check} onChangeSlot={onChangeSlot} />
      )}
      <SaveError failure={saving.failure} onChangeSlot={onChangeSlot} />
      <Button
        label={saving.busy ? texts.submitting : texts.submit}
        busy={saving.busy}
        disabled={!ready}
        onPress={saving.submit}
      />
    </View>
  );
}

/** «احفظ» refused: a clash since the check (other times), or the API's line for its code. */
function SaveError({ failure, onChangeSlot }: { failure: BookFailure | null; onChangeSlot: () => void }) {
  if (!failure) return null;
  if (failure.kind === 'conflict') return <ConflictNotice lines={failure.lines} onChangeSlot={onChangeSlot} />;
  return <ErrorLine message={failure.kind === 'duplicate' ? t.common.error : failure.text} />;
}
