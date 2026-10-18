import { counted, type BookingRequest, type SalesCourseView } from '@ab/shared';
import { View } from 'react-native';
import type { BookFailure } from '@/booking/booking-errors';
import { ConflictNotice } from '@/booking/ConflictNotice';
import { SummaryList } from '@/booking/ConfirmStep';
import { PicksList } from '@/booking/PicksList';
import { ErrorLine } from '@/inbox/ErrorLine';
import { t } from '@/lib/i18n';
import { localDay } from '@/payments/format';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';
import { type, useTheme } from '@/theme';
import { courseEnd } from './course-body';
import { courseRows } from './course-summary';
import { useCourseCheck } from './course-queries';
import { CourseCheckNotice } from './CourseCheckNotice';

export interface CourseConfirmProps {
  view: SalesCourseView;
  teacherName: string;
  picks: readonly string[];
  /** The request «احجز» sends; null until a teacher and a day are picked. */
  body: BookingRequest | null;
  booking: { busy: boolean; failure: BookFailure | null; submit: () => void };
  onChangeSlot: () => void;
}

/**
 * «المراجعة» of the course: the student, the teacher, the plan, each day with its time and when the
 * course ends (its lessons_total-th lesson). «احجز» waits for exactly the plan's days a week and a
 * clean series check (POST /sales/booking/check).
 */
export function CourseConfirm({ view, teacherName, picks, body, booking, onChangeSlot }: CourseConfirmProps) {
  const { color } = useTheme();
  const check = useCourseCheck(body);
  const total = view.subscription?.lessons_total ?? 0;
  const ends = body ? courseEnd(body, total) : null;
  const clean = check.isSuccess && check.data.conflicts.length === 0;
  const ready = body !== null && picks.length === view.perWeek && clean;
  const note = { fontFamily: type.ui[500], fontSize: type.size.sm, lineHeight: type.lineHeight(type.size.sm), color: color.ink2 };
  return (
    <View style={{ gap: 14 }}>
      <SummaryList rows={courseRows({ view, teacherName, body })} />
      <PicksList picks={picks} tz={view.student.tz} />
      {ends ? <AppText style={{ ...note, color: color.ink }}>{counted(t.booking.courseEnds, total).replace('{date}', localDay(ends))}</AppText> : null}
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
