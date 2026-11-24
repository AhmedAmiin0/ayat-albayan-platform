import { courseLessonCount, type BookingRequest, type SalesCourseView } from '@ab/shared';
import { counted } from '@ab/core';
import type { Conflict } from '@ab/schedule';
import { View } from 'react-native';
import { type BookFailure, ConflictNotice } from '@/booking';
import { SummaryList } from '@/booking/trial/components/ConfirmStep';
import { PicksList } from '@/booking/shared/PicksList';
import { t, AppText, Button, type, useTheme, ErrorLine } from '@ab/mobile-kit';
import { localDay } from '@/core/lib/money/format';
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
  /** Null until a teacher and a day are picked. */
  body: BookingRequest | null;
  booking: { busy: boolean; failure: BookFailure | null; submit: () => void };
  onChangeSlot: () => void;
  /** A clash on a prefilled day still kept names that day. */
  prefilled?: readonly string[];
}

/** Booking waits for exactly the plan's weekly days and a clean series check. */
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

function BookError({ failure, onChangeSlot }: { failure: BookFailure | null; onChangeSlot: () => void }) {
  if (!failure) return null;
  if (failure.kind === 'conflict') return <ConflictNotice lines={failure.lines} onChangeSlot={onChangeSlot} />;
  return <ErrorLine message={failure.kind === 'duplicate' ? t.common.error : failure.text} />;
}

/** One line per still-prefilled day the series check found taken. */
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
