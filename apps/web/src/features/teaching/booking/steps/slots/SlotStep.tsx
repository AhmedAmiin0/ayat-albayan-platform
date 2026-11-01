import { lessonWhenAt, sameClockAt } from '@ab/shared';
import { RequiredMark } from '@/components/ui/form/label';
import { tzCity } from '@/components/ui/form/time-zone-select';
import { SlotPicker } from '@/features/teaching/schedule/reschedule/SlotPicker';
import { t } from '@/lib/i18n/i18n';
import { pickPatch, type BookingDraft } from '@/features/teaching/booking/draft/draft';
import { SeriesCheck } from '@/features/teaching/booking/steps/review/SeriesCheck';
import { pickHint, SlotDays } from './SlotDays';
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
 * Step 4 (R-SCH-06): the lessons from the teacher's real free slots (length picked with the package).
 * A package picks one slot per weekday, each at its own time (owner 2026-10-18); the earliest is the
 * first lesson. A trial or a makeup is one lesson: one slot, no repeat.
 */
export function SlotStep({ draft, onChange }: SlotStepProps) {
  const clock = { ...useClock(), tz: useViewerTz() };
  const teacher = draft.teacher;
  if (!teacher) return null;
  const pkg = draft.kind === 'package';

  return (
    <div className="grid gap-5">
      <section className="grid gap-2">
        <h3 className="text-sm font-semibold">
          {t.booking.pickTime}
          <RequiredMark />
        </h3>
        {pkg && <p className="text-xs text-ink-2">{pickHint(draft)}</p>}
        <SlotPicker
          teacherId={teacher.id}
          durationMin={draft.durationMin}
          studentIds={draft.students.map((s) => s.id)}
          studentTz={draft.tz}
          value={draft.startsAt}
          also={pkg ? draft.extra : undefined}
          onPick={(slot) => onChange(pickPatch(draft, slot.starts_at))}
          excludeLessonId={draft.trialDate?.upcomingId ?? undefined}
          {...(draft.course ? { near: courseNear(draft.course.startsOn) } : {})}
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
          {pkg && <SlotDays draft={draft} onChange={onChange} />}
          <SeriesCheck draft={draft} />
        </>
      ) : (
        <p className="text-xs text-ink-3">{t.booking.pickSlotFirst}</p>
      )}
    </div>
  );
}
