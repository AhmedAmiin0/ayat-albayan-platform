import type { BookedCourse } from '@ab/shared';
import { counted } from '@ab/core';
import { View } from 'react-native';
import { type BookFailure, ConflictNotice } from '@/booking';
import { t, AppText, Button, type, useTheme, ErrorLine, whenText } from '@ab/mobile-kit';
import { localDay } from '@/core/lib/money/format';
import { CourseCheckNotice } from '@/sales-course/components/CourseCheckNotice';
import { daysText, requestDays } from '@/sales-course/lib/course-days';
import type { ChangeTarget } from './change-body';
import type { ChangeBody } from './change-calls.types';
import { useCourseChangeCheck } from './change-queries';
import { useOverride } from './OverrideField';
import { useClockCycle, useViewerTz } from '@/core/lib/clock';

interface CourseChangeReviewProps {
  course: BookedCourse;
  picks: readonly string[];
  /** Null until a day is picked. */
  body: ChangeBody | null;
  /** reason: the admin's clash override (target.override), else none. */
  saving: { busy: boolean; failure: BookFailure | null; submit: (reason?: string) => void };
  onChangeSlot: () => void;
  target?: ChangeTarget | undefined;
}

/** A clash blocks the assistant with no override; she must pick other times. */
export function CourseChangeReview(props: CourseChangeReviewProps) {
  const { course, picks, body, saving, onChangeSlot, target } = props;
  const cycle = useClockCycle();
  const tz = useViewerTz();
  const viewer = { tz, cycle };
  const { color } = useTheme();
  const check = useCourseChangeCheck(body, target?.calls);
  const need = course.perWeek ?? course.days.length;
  const override = useOverride({ target, check });
  const ready = body !== null && picks.length === need && !override.blocked;
  const line = { fontFamily: type.ui[500], fontSize: type.size.sm, lineHeight: type.lineHeight(type.size.sm), color: color.ink };
  const texts = t.booking.courseChange;
  return (
    <View style={{ gap: 14 }}>
      <View style={{ gap: 4 }}>
        {target?.lines?.map((text) => (
          <AppText key={text} style={line}>
            {text}
          </AppText>
        ))}
        <AppText style={{ ...line, color: color.ink2 }}>{texts.currentDays.replace('{days}', daysText(course.days, course.tz, viewer))}</AppText>
        {body ? <AppText style={line}>{texts.newDays.replace('{days}', daysText(requestDays(body), course.tz, viewer))}</AppText> : null}
      </View>
      {check.isSuccess ? (
        <View style={{ gap: 4 }}>
          <AppText style={line}>{counted(texts.remaining, check.data.remaining)}</AppText>
          <AppText style={line}>{texts.newEnd.replace('{date}', localDay(check.data.endsOn))}</AppText>
        </View>
      ) : null}
      {body ? <AppText style={line}>{texts.firstNew.replace('{when}', whenText(body.startsAt, course.tz, viewer))}</AppText> : null}
      {check.isPending ? (
        <AppText style={{ ...line, color: color.ink2 }}>{texts.checking}</AppText>
      ) : (
        <CourseCheckNotice check={check} onChangeSlot={onChangeSlot} />
      )}
      {override.field}
      <SaveError failure={saving.failure} onChangeSlot={onChangeSlot} />
      <Button
        label={saving.busy ? texts.submitting : texts.submit}
        busy={saving.busy}
        disabled={!ready}
        onPress={() => saving.submit(override.reason)}
      />
    </View>
  );
}

function SaveError({ failure, onChangeSlot }: { failure: BookFailure | null; onChangeSlot: () => void }) {
  if (!failure) return null;
  if (failure.kind === 'conflict') return <ConflictNotice lines={failure.lines} onChangeSlot={onChangeSlot} />;
  return <ErrorLine message={failure.kind === 'duplicate' ? t.common.error : failure.text} />;
}
