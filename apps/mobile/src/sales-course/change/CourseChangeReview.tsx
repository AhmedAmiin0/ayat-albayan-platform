import { counted, type BookedCourse, type CourseChangeRequest } from '@ab/shared';
import { View } from 'react-native';
import type { BookFailure } from '@/booking/booking-errors';
import { ConflictNotice } from '@/booking/ConflictNotice';
import { PicksList } from '@/booking/PicksList';
import { whenText } from '@/booking/slots';
import { ErrorLine } from '@/inbox/ErrorLine';
import { t } from '@/lib/i18n';
import { localDay } from '@/payments/format';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';
import { type, useTheme } from '@/theme';
import { CourseCheckNotice } from '../CourseCheckNotice';
import { useCourseChangeCheck } from './change-queries';

export interface CourseChangeReviewProps {
  course: BookedCourse;
  picks: readonly string[];
  /** The request «احفظ الأيام الجديدة» sends; null until a day is picked. */
  body: CourseChangeRequest | null;
  saving: { busy: boolean; failure: BookFailure | null; submit: () => void };
  onChangeSlot: () => void;
}

/**
 * The change's review: the new days, the first lesson on them, how many lessons they carry and the
 * new last day (POST …/course/change/check). A clash blocks the assistant (no override, owner
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
      <PicksList picks={picks} tz={course.tz} />
      {body ? <AppText style={line}>{texts.firstNew.replace('{when}', whenText(body.startsAt, course.tz))}</AppText> : null}
      {check.isSuccess ? (
        <View style={{ gap: 4 }}>
          <AppText style={line}>{counted(texts.remaining, check.data.remaining)}</AppText>
          <AppText style={line}>{texts.newEnd.replace('{date}', localDay(check.data.endsOn))}</AppText>
        </View>
      ) : null}
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
