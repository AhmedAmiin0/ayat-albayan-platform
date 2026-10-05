import { lessonWhenText } from '@ab/shared';
import { RequiredMark } from '@/components/ui/label';
import { tzCity } from '@/components/ui/time-zone-select';
import { SlotPicker } from '@/features/schedule/SlotPicker';
import { RIYADH_TZ } from '@/features/schedule/tz';
import { t } from '@/lib/i18n';
import { locale } from '@/lib/locale';
import { ByDayPicker } from './ByDayPicker';
import { effectiveByday, ruleFromSlot, type BookingDraft } from './draft';
import { SeriesCheck } from './SeriesCheck';

export interface SlotStepProps {
  draft: BookingDraft;
  onChange: (patch: Partial<Pick<BookingDraft, 'startsAt' | 'byday'>>) => void;
}

/** «الأحد 4 أكتوبر 17:00 بتوقيت الرياض» (+ the family's wall clock when it differs). */
export function pickedText(startsAt: string, tz: string): string {
  const at = new Date(startsAt);
  const riyadh = `${lessonWhenText(at, RIYADH_TZ, locale)} ${t.schedule.riyadhTime}`;
  if (tz === RIYADH_TZ) return riyadh;
  const local = t.schedule.inCity.replace('{time}', lessonWhenText(at, tz, locale)).replace('{city}', tzCity(tz) ?? tz);
  return `${riyadh}${t.common.listSeparator}${t.booking.studentLocal.replace('{time}', local)}`;
}

/**
 * Step 4 (R-SCH-06): «الساعه» and «تاريخ اول حصه», the first lesson from the teacher's real free slots (length picked with the
 * package), then the weekly repeat days at that same local time. A trial or a makeup is one lesson: no repeat.
 */
export function SlotStep({ draft, onChange }: SlotStepProps) {
  const teacher = draft.teacher;
  if (!teacher) return null;
  const days = effectiveByday(draft);

  return (
    <div className="grid gap-5">
      <section className="grid gap-2">
        <h3 className="text-sm font-semibold">
          {t.booking.pickTime}
          <RequiredMark />
        </h3>
        <SlotPicker
          teacherId={teacher.id}
          durationMin={draft.durationMin}
          studentIds={draft.students.map((s) => s.id)}
          studentTz={draft.tz}
          value={draft.startsAt}
          onPick={(slot) => onChange({ startsAt: slot.starts_at, byday: [] })}
        />
      </section>
      {draft.startsAt ? (
        <>
          <section aria-label={t.booking.startsOn} className="grid gap-2">
            <h3 className="text-sm font-semibold">{t.booking.startsOn}</h3>
            <p role="status" className="rounded-md bg-sunk px-3.5 py-2.5 text-sm">
              {t.booking.picked.replace('{when}', pickedText(draft.startsAt, draft.tz))}
            </p>
          </section>
          {draft.kind === 'package' && (
            <ByDayPicker
              fixed={ruleFromSlot(draft.startsAt, draft.tz).weekday}
              value={days}
              onChange={(byday) => onChange({ byday })}
              pkg={draft.pkg}
            />
          )}
          <SeriesCheck draft={draft} />
        </>
      ) : (
        <p className="text-xs text-ink-3">{t.booking.pickSlotFirst}</p>
      )}
    </div>
  );
}
