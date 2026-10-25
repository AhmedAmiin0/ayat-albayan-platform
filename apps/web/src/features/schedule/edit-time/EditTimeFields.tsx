import { clockTime, DURATIONS } from '@ab/shared';
import { Field } from '@/components/ui/form/field';
import { Input } from '@/components/ui/form/input';
import { RadioChips } from '@/components/ui/form/radio-chips';
import { Select } from '@/components/ui/form/select';
import { tzCity } from '@/components/ui/form/time-zone-select';
import { t } from '@/lib/i18n/i18n';
import { validLength } from './edit-time';
import { lengthText } from './edit-time-text';
import type { TimeEditMode } from './edit-time.contract';
import { dateLabel, dayMonthLabel, RIYADH_TZ, weekdayOf, zonedToUtc } from '../tz';

export interface FieldState {
  date: string;
  time: string;
  durationMin: number;
  reason: string;
}

export interface EditTimeFieldsProps {
  mode: TimeEditMode;
  /** The teacher's zone: the day and the time are picked on their clock. */
  tz: string;
  value: FieldState;
  onChange: (patch: Partial<FieldState>) => void;
  /** Start times on offer (edit-time.ts timesFor). */
  times: readonly string[];
  /** Move: today and the next six days. */
  days: readonly string[];
  /** Correct: the reason is required and the last submit found it empty. */
  reasonMissing: boolean;
}

const weekday: Record<string, string> = t.enums.weekday;
/** The four bookable lengths; a migrated lesson's odd one (40) stays visible so the select tells the truth. */
const lengths = (current: number): number[] => (DURATIONS.some((d) => d === current) ? [...DURATIONS] : [...DURATIONS, current].sort((a, b) => a - b));
const dayText = (date: string) => `${weekday[String(weekdayOf(date))] ?? ''} ${dayMonthLabel(date)}`;

/** «= 18:00 بتوقيت الرياض» when the picked teacher-clock time reads differently in Riyadh (Cairo's DST), else nothing. */
function riyadhHint(p: { tz: string; date: string; time: string }): string | undefined {
  if (p.tz === RIYADH_TZ) return undefined;
  const riyadh = clockTime(zonedToUtc(p.date, p.time, p.tz), RIYADH_TZ);
  return riyadh === p.time ? undefined : t.lessons.timeEdit.riyadhEquiv.replace('{time}', riyadh);
}

/**
 * «عدّل الوقت» fields (R-SCH-11), all picked, none typed: day chips + «تاريخ تاني» (move) or the
 * lesson's own day (correct), the start in 15-minute steps on the teacher's clock, the length and
 * the reason (required for a correction). An odd migrated length is flagged until a valid one is picked.
 */
export function EditTimeFields({ mode, tz, value, onChange, times, days, reasonMissing }: EditTimeFieldsProps) {
  const move = mode === 'move';
  const offChip = !days.includes(value.date);
  return (
    <div className="grid gap-4">
      {move ? (
        <>
          <RadioChips
            scroll
            name="edit-time-day"
            legend={t.lessons.timeEdit.date}
            options={days.map((d) => ({ value: d, label: dayText(d) }))}
            value={offChip ? null : value.date}
            onChange={(date) => onChange({ date })}
          />
          <details open={offChip} className="grid gap-2">
            <summary className="min-h-8 cursor-pointer text-sm font-semibold text-lapis">{t.lessons.timeEdit.otherDate}</summary>
            <Field label={t.lessons.timeEdit.otherDate} hint={dateLabel(value.date)}>
              {(p) => (
                <Input {...p} type="date" dir="ltr" min={days[0]} value={value.date} onChange={(e) => e.target.value && onChange({ date: e.target.value })} />
              )}
            </Field>
          </details>
        </>
      ) : (
        <div className="grid gap-0.5">
          <p className="text-sm font-semibold">{t.lessons.timeEdit.date}</p>
          <p className="text-sm">{dayText(value.date)}</p>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Field label={t.lessons.timeEdit.time.replace('{city}', tzCity(tz) ?? tz)} hint={riyadhHint({ tz, date: value.date, time: value.time })}>
          {(p) => (
            <Select {...p} dir="ltr" value={value.time} onChange={(e) => onChange({ time: e.target.value })}>
              {times.map((x) => (
                <option key={x} value={x}>{x}</option>
              ))}
            </Select>
          )}
        </Field>
        <Field label={t.lessons.timeEdit.duration} error={validLength(value.durationMin) ? undefined : t.lessons.timeEdit.pickLength}>
          {(p) => (
            <Select {...p} value={value.durationMin} onChange={(e) => onChange({ durationMin: Number(e.target.value) })}>
              {lengths(value.durationMin).map((d) => (
                <option key={d} value={d}>{lengthText(d)}</option>
              ))}
            </Select>
          )}
        </Field>
      </div>
      <Field
        label={t.lessons.timeEdit.reason}
        hint={t.lessons.timeEdit.reasonHint}
        required={!move}
        error={reasonMissing ? t.lessons.error.reason_required : undefined}
      >
        {(p) => <Input {...p} value={value.reason} maxLength={300} onChange={(e) => onChange({ reason: e.target.value })} />}
      </Field>
    </div>
  );
}
