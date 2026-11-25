import { counted } from '@ab/core';
import { pickProgress } from '@ab/schedule';
import { useId } from 'react';
import { RequiredMark, t, useClock, useViewerTz } from '@ab/web-kit';
import { dayPicks } from '@/features/teaching/booking/draft/draft.days';
import type { BookingDraft } from '@/features/teaching/booking/draft/draft';
import { dayAtText } from './DayTimesList';
import { PACKAGE_NOTE_CLASS, packageDaysNote } from '@/features/teaching/booking/steps/package/package-days';

export interface SlotDaysProps {
  draft: BookingDraft;
}

/** What to pick: the assistant's course needs exactly its days a week; the admin picks freely. */
export const pickHint = (d: Pick<BookingDraft, 'course'>): string =>
  d.course ? counted(t.booking.pickNDays, d.course.perWeek) : t.booking.pickDayTimes;

export function daysNote(d: Pick<BookingDraft, 'course' | 'pkg'>, picked: number): string | null {
  return d.course
    ? pickProgress(t.booking, picked, d.course.perWeek)
    : packageDaysNote(d.pkg, picked);
}

/** The assistant's course can't go on until the days add up (R-SCH-02). */
export function SlotDays({ draft }: SlotDaysProps) {
  const titleId = useId();
  const clock = { ...useClock(), tz: useViewerTz() };
  const picks = dayPicks(draft);
  const note = daysNote(draft, picks.length);
  return (
    <section aria-labelledby={titleId} className="grid gap-2">
      <h3 id={titleId} className="text-sm font-semibold">
        {t.booking.pickDays}
        <RequiredMark />
        <span className="ms-2 text-xs font-normal text-ink-3 tabular-nums">
          {counted(t.booking.perWeek, picks.length)}
        </span>
      </h3>
      <ul className="flex flex-wrap gap-2">
        {picks.map((p) => (
          <li key={p.at} className="rounded-md border border-rule bg-raised px-3 py-1.5 text-sm tabular-nums">
            {dayAtText(p, clock, draft.tz)}
          </li>
        ))}
      </ul>
      {note && <p className={draft.course ? 'text-xs text-ink-2' : PACKAGE_NOTE_CLASS}>{note}</p>}
    </section>
  );
}
