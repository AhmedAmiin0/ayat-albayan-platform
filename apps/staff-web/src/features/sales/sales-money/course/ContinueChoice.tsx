import { continueFits, type SalesCourseView } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { Button, FormAlert, t, useClock, useViewerTz } from '@ab/web-kit';
import { bookingTeachersQuery } from '@/features/teaching/booking/api';
import type { BookingDraft } from '@/features/teaching/booking/draft/draft';
import { adjustText, continueText } from './course-continue';

export interface ContinueChoiceProps {
  view: SalesCourseView;
  /** The course draft: its program and teacher preference list the teachers the wizard can book. */
  draft: Pick<BookingDraft, 'program' | 'genderPref'>;
  /** ISO now: the new start is never before today. */
  now: string;
  /** The wizard opens with the previous teacher and days picked. */
  onContinue: () => void;
  /** The empty picker on the same opening week. */
  onOther: () => void;
}

/** Either primary needs the previous teacher still bookable; a failed read shows a retry alert. */
/** The primary label: the days saved before the payment are edited, a previous course continued. */
const sameLabel = (view: SalesCourseView): string =>
  view.draft ? t.booking.courseChange.draftEdit : t.booking.courseChange.continueSameDays;

export function ContinueChoice({ view, draft, now, onContinue, onOther }: ContinueChoiceProps) {
  const clock = { ...useClock(), tz: useViewerTz() };
  const teachers = useQuery(
    bookingTeachersQuery({ program: draft.program, gender: draft.genderPref }, 'sales'),
  );
  const fits = continueFits(view);
  // isSuccess, not data: a failed refetch keeps the last list, never an enabled continue beside it.
  const bookable =
    teachers.isSuccess &&
    teachers.data.some((o) => o.id === view.previous?.teacherId && o.has_availability);
  const unavailable = teachers.isSuccess && !bookable;
  const same = sameLabel(view);
  return (
    <div className="grid gap-4">
      <p className="rounded-md bg-sunk px-3.5 py-2.5 text-sm tabular-nums">
        {fits ? continueText(view, clock, now) : adjustText(view, clock)}
      </p>
      {teachers.isPending && (
        <p role="status" className="text-sm text-ink-2">
          {t.common.loading}
        </p>
      )}
      {teachers.isError && (
        <div className="grid justify-items-start gap-2">
          <FormAlert>{t.common.error}</FormAlert>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => void teachers.refetch()}
          >
            {t.sales.retry}
          </Button>
        </div>
      )}
      {unavailable && (
        <p role="status" className="text-sm text-ink-2">
          {t.booking.courseChange.teacherUnavailable}
        </p>
      )}
      <div className="flex flex-wrap gap-2.5">
        <Button type="button" disabled={!bookable} onClick={onContinue}>
          {fits ? same : t.booking.courseChange.adjustDays}
        </Button>
        <Button type="button" variant="secondary" onClick={onOther}>
          {t.booking.courseChange.pickOtherDays}
        </Button>
      </div>
    </div>
  );
}
