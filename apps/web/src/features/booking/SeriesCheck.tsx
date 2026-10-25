import { useQuery } from '@tanstack/react-query';
import { FormAlert } from '@/components/ui/form-alert';
import { NuqtaGlyph } from '@/components/ui/nuqta-glyph';
import { lessonErrorText } from '@/features/schedule/api';
import { conflictText } from '@/features/schedule/ConflictNotice';
import { t } from '@/lib/i18n';
import { bookingCheckQuery } from './api';
import { takenTexts } from './course-taken';
import type { BookingBody } from './contract';
import { days, toBookingRequest, type BookingDraft } from './draft';
import { useBookingMode } from './mode';
import { trialDateCheckQuery } from './trial-date/api';

/** How many clashes are listed under the count. */
const SHOWN = 4;

/** Whether the series can be checked: a course only once exactly its days a week are picked. */
export const seriesReady = (d: BookingDraft): boolean => !d.course || days(d).length === d.course.perWeek;

/**
 * POST {base}/check (a new trial date: {base}/trial-date/check) for this draft (one cached query, shared by the slot and review steps).
 * `enabled` false only reads the cache (the admin's review and the wizard's chrome never ask).
 */
export function useSeriesCheck(draft: BookingDraft, enabled = true) {
  const mode = useBookingMode();
  const body = seriesReady(draft) ? toBookingRequest(draft) : null;
  // A new trial date is checked by its own route: the trial it moves never clashes with it.
  const query = draft.trialDate ? trialDateCheckQuery : bookingCheckQuery;
  return { body, check: useQuery({ ...query(body ?? emptyBody, mode), enabled: enabled && body !== null }) };
}

export type SeriesCheckResult = ReturnType<typeof useSeriesCheck>;

/** Checked, no error and no clash over the whole series. */
export const isSeriesClean = ({ body, check }: SeriesCheckResult): boolean =>
  body !== null && !check.isError && Array.isArray(check.data?.conflicts) && check.data.conflicts.length === 0;

/** The assistant's course leaves the slot step and books only over a clean check (no override). */
export function useCourseClean(draft: BookingDraft): boolean {
  return isSeriesClean(useSeriesCheck(draft, draft.course !== null));
}

/**
 * Under the picked slot (R-SCH-04, R-SCH-06): what «احجز» would clash with over the whole series
 * (POST /booking/check), so a clash in a later week — time off, or the teacher's availability
 * after a DST change — shows before the review step, on the teacher's clock too. Silent on error
 * (the review step reports it), except for the assistant's course, which can't book until it is clean.
 * A course is checked only once its days are all picked (SlotDays shows the progress until then).
 * A renewal's prefilled day that clashes is named («موعد الأحد لم يعد متاحًا…», takenTexts).
 */
export function SeriesCheck({ draft }: { draft: BookingDraft }) {
  const { body, check } = useSeriesCheck(draft);
  if (!body) return null;
  if (check.isError) return draft.course ? <FormAlert>{lessonErrorText(check.error)}</FormAlert> : null;
  if (!check.data) return <p className="text-xs text-ink-3">{t.booking.seriesChecking}</p>;
  const conflicts = Array.isArray(check.data.conflicts) ? check.data.conflicts : [];
  if (conflicts.length === 0) {
    return (
      <p className="flex items-center gap-1.5 text-xs text-ink-2">
        <NuqtaGlyph shape="fill" className="text-ok" />
        {t.booking.seriesFree}
      </p>
    );
  }
  return (
    <div role="status" className="grid gap-1.5 rounded-md bg-danger-soft px-3.5 py-2.5 text-sm">
      <p className="flex items-center gap-1.5 font-semibold">
        <NuqtaGlyph shape="struck" className="text-danger" />
        {t.booking.seriesCheck.replace('{n}', String(conflicts.length))}
      </p>
      {takenTexts(draft, conflicts).map((line) => (
        <p key={line}>{line}</p>
      ))}
      <ul className="grid gap-1 text-xs text-ink-2">
        {conflicts.slice(0, SHOWN).map((c, i) => (
          <li key={`${c.kind}-${c.startsAt}-${i}`}>{conflictText(c, draft.teacher?.tz)}</li>
        ))}
      </ul>
    </div>
  );
}

// Only to keep the hook call unconditional; a disabled query never runs.
const emptyBody: BookingBody = {
  teacherId: '',
  byday: [0],
  startTimeLocal: '00:00',
  tz: 'Asia/Riyadh',
  durationMin: 45,
  startsOn: '2026-01-01',
  package: 'trial',
  kind: 'trial',
  studentIds: [''],
};
