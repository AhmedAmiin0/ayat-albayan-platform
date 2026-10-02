import { DURATIONS, lessonWhenText } from '@ab/shared';
import { Field } from '@/components/ui/field';
import { Select } from '@/components/ui/select';
import { tzCity } from '@/components/ui/time-zone-select';
import { SlotPicker } from '@/features/schedule/SlotPicker';
import { RIYADH_TZ } from '@/features/schedule/tz';
import { t } from '@/lib/i18n';
import { ByDayPicker } from './ByDayPicker';
import { effectiveByday, ruleFromSlot, type BookingDraft } from './draft';

export interface SlotStepProps {
  draft: BookingDraft;
  onChange: (patch: Partial<Pick<BookingDraft, 'durationMin' | 'startsAt' | 'byday'>>) => void;
}

/** «الأحد 4 أكتوبر 17:00 بتوقيت الرياض» (+ the family's wall clock when it differs). */
export function pickedText(startsAt: string, tz: string): string {
  const at = new Date(startsAt);
  const riyadh = `${lessonWhenText(at, RIYADH_TZ)} ${t.schedule.riyadhTime}`;
  if (tz === RIYADH_TZ) return riyadh;
  const local = t.schedule.inCity.replace('{time}', lessonWhenText(at, tz)).replace('{city}', tzCity(tz) ?? tz);
  return `${riyadh}، ${t.booking.studentLocal.replace('{time}', local)}`;
}

/**
 * Step 3 (R-SCH-06): the lesson length, the first lesson from the teacher's real free slots, then
 * the weekly repeat days at that same local time. A trial is one lesson, so it has no repeat.
 */
export function SlotStep({ draft, onChange }: SlotStepProps) {
  const teacher = draft.teacher;
  if (!teacher) return null;
  const days = effectiveByday(draft);

  return (
    <div className="grid gap-5">
      <div className="sm:max-w-[220px]">
        <Field label={t.booking.pickDuration}>
          {(p) => (
            <Select
              {...p}
              value={draft.durationMin}
              onChange={(e) => {
                const next = DURATIONS.find((d) => String(d) === e.target.value);
                if (next) onChange({ durationMin: next, startsAt: null });
              }}
            >
              {DURATIONS.map((d) => (
                <option key={d} value={d}>
                  {t.enums.duration[d]}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>
      <section className="grid gap-2">
        <h3 className="text-sm font-semibold">{t.booking.freeSlots}</h3>
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
          <p role="status" className="rounded-md bg-sunk px-3.5 py-2.5 text-sm">
            {t.booking.picked.replace('{when}', pickedText(draft.startsAt, draft.tz))}
          </p>
          {draft.pkg !== 'trial' && (
            <ByDayPicker
              fixed={ruleFromSlot(draft.startsAt, draft.tz).weekday}
              value={days}
              onChange={(byday) => onChange({ byday })}
            />
          )}
        </>
      ) : (
        <p className="text-xs text-ink-3">{t.booking.pickSlotFirst}</p>
      )}
    </div>
  );
}
