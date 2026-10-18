import { useQuery } from '@tanstack/react-query';
import { FormAlert } from '@/components/ui/form-alert';
import { NuqtaGlyph } from '@/components/ui/nuqta-glyph';
import { lessonErrorText } from '@/features/schedule/api';
import { conflictText } from '@/features/schedule/ConflictNotice';
import { t } from '@/lib/i18n';
import { bookingCheckQuery } from './api';
import type { BookingBody } from './contract';
import { toBookingRequest, type BookingDraft } from './draft';
import { useBookingMode } from './mode';

/** How many clashes are listed under the count. */
const SHOWN = 4;

/** POST {base}/check for this draft (one cached query, shared by the slot and review steps). */
export function useSeriesCheck(draft: BookingDraft) {
  const mode = useBookingMode();
  const body = toBookingRequest(draft);
  return { body, check: useQuery({ ...bookingCheckQuery(body ?? emptyBody, mode), enabled: body !== null }) };
}

/** The assistant's course books only when the whole series is checked and free (no override). */
export function useSeriesClean(draft: BookingDraft): boolean {
  const { body, check } = useSeriesCheck(draft);
  return body !== null && Array.isArray(check.data?.conflicts) && check.data.conflicts.length === 0;
}

/**
 * Under the picked slot (R-SCH-04, R-SCH-06): what «احجز» would clash with over the whole series
 * (POST /booking/check), so a clash in a later week — time off, or the teacher's availability
 * after a DST change — shows before the review step, on the teacher's clock too. Silent on error
 * (the review step reports it), except for the assistant's course, which can't book until it is clean.
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
