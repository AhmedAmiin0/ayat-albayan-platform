import { lessonWhenAt, sameClockAt } from '@ab/shared';
import { RequiredMark } from '@/components/ui/form/label';
import { tzCity } from '@/components/ui/form/time-zone-select';
import { SlotPicker } from '@/features/teaching/schedule/reschedule/SlotPicker';
import { t } from '@/lib/i18n/i18n';
import { pickPatch, type BookingDraft } from '@/features/teaching/booking/draft/draft';
import { SeriesCheck } from '@/features/teaching/booking/steps/review/SeriesCheck';
import { pickHint, SlotDays } from './SlotDays';
import { LessonRows } from './lesson-rows';
import { type Clock, useClock } from '@/lib/clock';
import { useViewerTz } from '@/lib/viewer-tz';

export interface SlotStepProps {
  draft: BookingDraft;
  onChange: (patch: Pick<BookingDraft, 'startsAt' | 'extra'>) => void;
}

/**
 * «الأحد 4 أكتوبر 17:00 بتوقيتك» in the viewer's zone `clock.tz` (useViewerTz()), + the family's
 * wall clock `tz` when it differs then.
 */
export function pickedText(startsAt: string, tz: string, clock: Clock & { tz: string }): string {
  const at = new Date(startsAt);
  const viewer = clock.tz;
  const mine = `${lessonWhenAt(at, clock)} ${t.schedule.viewerTime}`;
  if (sameClockAt(at, { a: tz, b: viewer })) return mine;
  const local = t.schedule.inCity.replace('{time}', lessonWhenAt(at, { ...clock, tz })).replace('{city}', tzCity(tz) ?? tz);
  return `${mine}${t.common.listSeparator}${t.booking.studentLocal.replace('{time}', local)}`;
}

/** A course's grid opens near its subscription's start: max(now, starts_on) (the picker never opens before this week). */
export function courseNear(startsOn: string, now: Date = new Date()): string {
  const start = new Date(`${startsOn}T12:00:00.000Z`); // midday UTC: the same date in every zone we serve
  return (start > now ? start : now).toISOString();
}

/**
 * Step 4 (R-SCH-06): a package picks a date and a time per lesson day (owner 2026-11-07), each read
 * against the teacher's free slots; the earliest is the first lesson. A trial or a makeup is one
 * lesson: one slot on the grid, no repeat.
 */
export function SlotStep({ draft, onChange }: SlotStepProps) {
  if (!draft.teacher) return null;
  const Step = draft.kind === 'package' ? PackageTimes : OneSlot;
  return <Step draft={draft} onChange={onChange} />;
}

/** A package: a date and a time per lesson day (LessonRows), the days they make, the series check. */
function PackageTimes({ draft, onChange }: SlotStepProps) {
  return (
    <div className="grid gap-5">
      <section className="grid gap-2">
        <h3 className="text-sm font-semibold">
          {t.lessonTimes.title}
          <RequiredMark />
        </h3>
        <p className="text-xs text-ink-2">{pickHint(draft)}</p>
        <LessonRows key={draft.teacher?.id} draft={draft} onChange={onChange} />
      </section>
      {draft.startsAt ? (
        <>
          <SlotDays draft={draft} />
          <SeriesCheck draft={draft} />
        </>
      ) : null}
    </div>
  );
}

/** A trial or a makeup: one lesson, picked on the teacher's free slots. */
function OneSlot({ draft, onChange }: SlotStepProps) {
  const clock = { ...useClock(), tz: useViewerTz() };
  const teacherId = draft.teacher?.id ?? '';
  return (
    <div className="grid gap-5">
      <section className="grid gap-2">
        <h3 className="text-sm font-semibold">
          {t.booking.pickTime}
          <RequiredMark />
        </h3>
        <SlotPicker
          teacherId={teacherId}
          durationMin={draft.durationMin}
          studentIds={draft.students.map((s) => s.id)}
          studentTz={draft.tz}
          value={draft.startsAt}
          onPick={(slot) => onChange(pickPatch(draft, slot.starts_at))}
          excludeLessonId={draft.trialDate?.upcomingId ?? undefined}
        />
      </section>
      {draft.startsAt ? (
        <>
          <section aria-label={t.booking.startsOn} className="grid gap-2">
            <h3 className="text-sm font-semibold">{t.booking.startsOn}</h3>
            <p role="status" className="rounded-md bg-sunk px-3.5 py-2.5 text-sm">
              {t.booking.picked.replace('{when}', pickedText(draft.startsAt, draft.tz, clock))}
            </p>
          </section>
          <SeriesCheck draft={draft} />
        </>
      ) : (
        <p className="text-xs text-ink-3">{t.booking.pickSlotFirst}</p>
      )}
    </div>
  );
}
