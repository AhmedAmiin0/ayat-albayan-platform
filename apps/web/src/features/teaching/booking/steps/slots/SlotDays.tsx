import { counted, pickProgress } from '@ab/shared';
import { useId } from 'react';
import { RequiredMark } from '@/components/ui/form/label';
import { t } from '@/lib/i18n/i18n';
import { dayPicks, draftPicks, withPicks } from '../../draft/draft.days';
import type { BookingDraft } from '../../draft/draft';
import { DayTimesList } from './DayTimesList';
import { PACKAGE_NOTE_CLASS, packageDaysNote } from '../package/package-days';

export interface SlotDaysProps {
  draft: BookingDraft;
  onChange: (patch: Pick<BookingDraft, 'startsAt' | 'extra'>) => void;
}

/** What to pick: the assistant's course needs exactly its days a week; the admin picks freely. */
export const pickHint = (d: Pick<BookingDraft, 'course'>): string =>
  d.course ? counted(t.booking.pickNDays, d.course.perWeek) : t.booking.pickDayTimes;

/** The course's neutral progress «اخترت 1 من 2 — بقي يوم واحد»; the admin's package note otherwise. */
export function daysNote(d: Pick<BookingDraft, 'course' | 'pkg'>, picked: number): string | null {
  return d.course ? pickProgress(t.booking, picked, d.course.perWeek) : packageDaysNote(d.pkg, picked);
}

/**
 * A package's weekly days (R-SCH-02, owner 2026-10-18), each with the time picked on the grid:
 * «الأحد الساعة 17:00 · الثلاثاء الساعة 19:30», each removable. The admin keeps the note when the
 * days don't add up to the package (packageDaysNote); the assistant's course shows how many are left
 * (pickProgress) and can't go on until they add up.
 */
export function SlotDays({ draft, onChange }: SlotDaysProps) {
  const titleId = useId();
  const picks = dayPicks(draft);
  const note = daysNote(draft, picks.length);
  const remove = (at: string) => onChange(withPicks(draftPicks(draft).filter((p) => p !== at)));
  return (
    <section aria-labelledby={titleId} className="grid gap-2">
      <h3 id={titleId} className="text-sm font-semibold">
        {t.booking.pickDays}
        <RequiredMark />
        <span className="ms-2 text-xs font-normal text-ink-3 tabular-nums">{counted(t.booking.perWeek, picks.length)}</span>
      </h3>
      <DayTimesList picks={picks} tz={draft.tz} onRemove={remove} />
      {note && <p className={draft.course ? 'text-xs text-ink-2' : PACKAGE_NOTE_CLASS}>{note}</p>}
    </section>
  );
}
