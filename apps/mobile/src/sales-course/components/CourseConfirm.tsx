import { counted, courseLessonCount, type BookingRequest, type Conflict, type SalesCourseView } from '@ab/shared';
import { View } from 'react-native';
import type { BookFailure } from '@/booking/shared/booking-errors';
import { ConflictNotice } from '@/booking/shared/ConflictNotice';
import { SummaryList } from '@/booking/trial/components/ConfirmStep';
import { PicksList } from '@/booking/shared/PicksList';
import { ErrorLine } from '@/core/ui/feedback/ErrorLine';
import { t } from '@/core/lib/i18n/i18n';
import { localDay } from '@/payments/format';
import { AppText } from '@/core/ui/primitives/AppText';
import { Button } from '@/core/ui/primitives/Button';
import { type, useTheme } from '@/theme';
import { courseEnd } from '@/sales-course/lib/course-body';
import { takenTexts, type TakenInput } from '@/sales-course/lib/course-days';
import { courseRows } from '@/sales-course/lib/course-summary';
import { useCourseCheck } from '@/sales-course/hooks/course-queries';
import { CourseCheckNotice } from './CourseCheckNotice';
import { useClockCycle, useViewerTz } from '@/core/lib/clock';

interface CourseConfirmProps {
  view: SalesCourseView;
  teacherName: string;
  picks: readonly string[];
  /** The request «احجز» sends; null until a teacher and a day are picked. */
  body: BookingRequest | null;
  booking: { busy: boolean; failure: BookFailure | null; submit: () => void };
  onChangeSlot: () => void;
  /** The previous course's days as prefilled («تابِع بنفس الأيام»): a clash on one still kept names its day. */
  prefilled?: readonly string[];
}

/**
 * «المراجعة» of the course: the student, the teacher, the plan, each day with its time and when the
 * course ends (its courseLessonCount-th lesson: lessons_total − lessons_used_before). «احجز» waits for exactly the plan's days a week and a
 * clean series check (POST /sales/booking/check). Prefilled from the previous course, a clash names its
 * day(s) («موعد الخميس لم يعد متاحًا»); «اختر موعدًا آخر» keeps the other picks.
 */
export function CourseConfirm(props: CourseConfirmProps) {
  const cycle = useClockCycle();
  const tz = useViewerTz();
  const viewer = { tz, cycle };
  const { view, teacherName, picks, body, booking, onChangeSlot, prefilled } = props;
  const { color } = useTheme();
  const check = useCourseCheck(body);
  const total = view.subscription ? courseLessonCount(view.subscription) : 0; // lessons used before the platform are not booked
  const ends = body ? courseEnd(body, total) : null;
  const clean = check.isSuccess && check.data.conflicts.length === 0;
  const ready = body !== null && picks.length === view.perWeek && clean;
  const note = { fontFamily: type.ui[500], fontSize: type.size.sm, lineHeight: type.lineHeight(type.size.sm), color: color.ink2 };
  return (
    <View style={{ gap: 14 }}>
      <SummaryList rows={courseRows({ view, teacherName, body, viewer })} />
      <PicksList picks={picks} tz={view.student.tz} />
      {ends ? <AppText style={{ ...note, color: color.ink }}>{counted(t.booking.courseEnds, total).replace('{date}', localDay(ends))}</AppText> : null}
      <TakenLines taken={{ picks, prefilled: prefilled ?? [], tz: view.student.tz }} data={check.data} />
      <CourseCheckNotice check={check} onChangeSlot={onChangeSlot} />
      <AppText style={note}>{t.booking.confirmationNote}</AppText>
      <BookError failure={booking.failure} onChangeSlot={onChangeSlot} />
      <Button
        label={booking.busy ? t.booking.submitting : t.booking.submit}
        busy={booking.busy}
        disabled={!ready}
        onPress={booking.submit}
      />
    </View>
  );
}

/** «احجز» refused: the clash (other times), or the API's line for its code. */
function BookError({ failure, onChangeSlot }: { failure: BookFailure | null; onChangeSlot: () => void }) {
  if (!failure) return null;
  if (failure.kind === 'conflict') return <ConflictNotice lines={failure.lines} onChangeSlot={onChangeSlot} />;
  return <ErrorLine message={failure.kind === 'duplicate' ? t.common.error : failure.text} />;
}

/** «موعد الخميس لم يعد متاحًا…», one line per still-prefilled day the series check found taken. */
interface TakenLinesProps {
  taken: TakenInput;
  /** The series check's answer, once in. */
  data: { conflicts: Conflict[] } | undefined;
}

function TakenLines({ taken, data }: TakenLinesProps) {
  const { color } = useTheme();
  const conflicts = data && Array.isArray(data.conflicts) ? data.conflicts : [];
  const style = { fontFamily: type.ui[600], fontSize: type.size.sm, lineHeight: type.lineHeight(type.size.sm), color: color.bad };
  return (
    <>
      {takenTexts(taken, conflicts).map((line) => (
        <AppText key={line} style={style}>
          {line}
        </AppText>
      ))}
    </>
  );
}
