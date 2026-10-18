import { continueFits, type SalesCourseView } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { bookingTeachersQuery } from '@/features/booking/api';
import type { BookingDraft } from '@/features/booking/draft';
import { t } from '@/lib/i18n';
import { continueText } from './course-continue';

export interface ContinueChoiceProps {
  view: SalesCourseView;
  /** The course draft: its program and teacher preference list the teachers the wizard can book. */
  draft: Pick<BookingDraft, 'program' | 'genderPref'>;
  /** ISO now: the new start is never before today. */
  now: string;
  /** «تابِع بنفس الأيام»: the wizard opens with the previous teacher and days picked. */
  onContinue: () => void;
  /** «اختر أيامًا أخرى»: the picker on the same opening week (prefilled when continuing does not fit). */
  onOther: () => void;
}

/**
 * A renewal's first question (owner 2026-10-18), inside «أيام الحلقات» before the wizard: the
 * previous course's days and the new start, then continue on them (primary) or pick other days.
 * Continuing is offered only when the previous course had the new plan's days a week (continueFits),
 * and only with its teacher still bookable here (in the wizard's teacher list, with availability).
 */
export function ContinueChoice({ view, draft, now, onContinue, onOther }: ContinueChoiceProps) {
  const teachers = useQuery(bookingTeachersQuery({ program: draft.program, gender: draft.genderPref }, 'sales'));
  const fits = continueFits(view);
  const bookable = !!teachers.data?.some((o) => o.id === view.previous?.teacherId && o.has_availability);
  const unavailable = fits && (teachers.isError || (!!teachers.data && !bookable));
  return (
    <div className="grid gap-4">
      <p className="rounded-md bg-sunk px-3.5 py-2.5 text-sm tabular-nums">{continueText(view, now)}</p>
      {unavailable && (
        <p role="status" className="text-sm text-ink-2">
          {t.booking.courseChange.teacherUnavailable}
        </p>
      )}
      <div className="flex flex-wrap gap-2.5">
        {fits && (
          <Button type="button" disabled={!bookable} onClick={onContinue}>
            {t.booking.courseChange.continueSameDays}
          </Button>
        )}
        <Button type="button" variant={fits ? 'secondary' : 'primary'} onClick={onOther}>
          {t.booking.courseChange.pickOtherDays}
        </Button>
      </div>
    </div>
  );
}
