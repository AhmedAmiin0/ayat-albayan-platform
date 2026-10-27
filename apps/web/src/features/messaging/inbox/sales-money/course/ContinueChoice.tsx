import { continueFits, type SalesCourseView } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/form/button';
import { FormAlert } from '@/components/ui/form/form-alert';
import { bookingTeachersQuery } from '@/features/teaching/booking/api';
import type { BookingDraft } from '@/features/teaching/booking/draft/draft';
import { t } from '@/lib/i18n/i18n';
import { adjustText, continueText } from './course-continue';
import { useClock } from '@/lib/clock';

export interface ContinueChoiceProps {
  view: SalesCourseView;
  /** The course draft: its program and teacher preference list the teachers the wizard can book. */
  draft: Pick<BookingDraft, 'program' | 'genderPref'>;
  /** ISO now: the new start is never before today. */
  now: string;
  /** «تابِع بنفس الأيام» / «عدّل الأيام السابقة»: the wizard opens with the previous teacher and days picked. */
  onContinue: () => void;
  /** «اختر أيامًا أخرى»: the empty picker on the same opening week. */
  onOther: () => void;
}

/**
 * A renewal's first question (owner 2026-10-18), inside «أيام الحلقات» before the wizard: the
 * previous course's days and the new start, then continue on them (primary) or pick other days.
 * With another day count than before (!continueFits) it says so and offers «عدّل الأيام السابقة»
 * (the picker prefilled, to bring the days to the new count) instead. Either primary needs the previous
 * teacher still bookable here (in the wizard's teacher list, with availability). While the list loads the
 * status line says so; a failed read (or refetch) is the error alert with a retry, never «unavailable».
 */
export function ContinueChoice({ view, draft, now, onContinue, onOther }: ContinueChoiceProps) {
  const clock = useClock();
  const teachers = useQuery(bookingTeachersQuery({ program: draft.program, gender: draft.genderPref }, 'sales'));
  const fits = continueFits(view);
  // isSuccess, not data: a failed refetch keeps the last list, never an enabled «تابِع» beside the error.
  const bookable = teachers.isSuccess && teachers.data.some((o) => o.id === view.previous?.teacherId && o.has_availability);
  const unavailable = teachers.isSuccess && !bookable;
  return (
    <div className="grid gap-4">
      <p className="rounded-md bg-sunk px-3.5 py-2.5 text-sm tabular-nums">{fits ? continueText(view, clock, now) : adjustText(view, clock)}</p>
      {teachers.isPending && (
        <p role="status" className="text-sm text-ink-2">
          {t.common.loading}
        </p>
      )}
      {teachers.isError && (
        <div className="grid justify-items-start gap-2">
          <FormAlert>{t.common.error}</FormAlert>
          <Button type="button" variant="secondary" size="sm" onClick={() => void teachers.refetch()}>
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
          {fits ? t.booking.courseChange.continueSameDays : t.booking.courseChange.adjustDays}
        </Button>
        <Button type="button" variant="secondary" onClick={onOther}>
          {t.booking.courseChange.pickOtherDays}
        </Button>
      </div>
    </div>
  );
}
