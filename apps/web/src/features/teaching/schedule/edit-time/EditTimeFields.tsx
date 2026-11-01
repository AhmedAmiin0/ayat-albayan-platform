import { clockOf, clockTime, DURATIONS, wallInstant, weekdayOf } from '@ab/shared';
import { Field } from '@/components/ui/form/field';
import { Input } from '@/components/ui/form/input';
import { RadioChips } from '@/components/ui/form/radio-chips';
import { Select } from '@/components/ui/form/select';
import { tzCity } from '@/components/ui/form/time-zone-select';
import { t } from '@/lib/i18n/i18n';
import { validLength } from './edit-time';
import { lengthText } from './edit-time-text';
import type { TimeEditMode } from './edit-time.contract';
import { dateLabel, dayMonthLabel } from '@/features/teaching/schedule/tz';
import { ClockOptions } from '@/lib/clock-options';
import { clockDir } from '@/lib/clock-text';
import { type Clock, useClock } from '@/lib/clock';
import { useViewerTz } from '@/lib/viewer-tz';

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

interface HintInput {
  /** The picker's zone (the teacher's) and the viewer's. */
  tz: string;
  viewer: string;
  date: string;
  time: string;
}

/** «= 17:00 بتوقيتك» when the picked teacher-clock time reads differently on the viewer's clock, else nothing. */
function viewerHint(p: HintInput, clock: Clock): string | undefined {
  if (p.tz === p.viewer) return undefined;
  const at = wallInstant(p.date, p.time, p.tz);
  // Compared as 24 h keys; shown in the viewer's cycle.
  if (clockTime(at, p.viewer) === p.time) return undefined;
  return t.lessons.timeEdit.viewerEquiv.replace('{time}', clockOf(at, { ...clock, tz: p.viewer }));
}

/**
 * «عدّل الوقت» fields (R-SCH-11), all picked, none typed: day chips + «تاريخ تاني» (move) or the
 * lesson's own day (correct), the start in 15-minute steps on the teacher's clock, the length and
 * the reason (required for a correction). An odd migrated length is flagged until a valid one is picked.
 */
export function EditTimeFields({ mode, tz, value, onChange, times, days, reasonMissing }: EditTimeFieldsProps) {
  const clock = useClock();
  const viewer = useViewerTz();
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
        <Field label={t.lessons.timeEdit.time.replace('{city}', tzCity(tz) ?? tz)} hint={viewerHint({ tz, viewer, date: value.date, time: value.time }, clock)}>
          {(p) => (
            <Select {...p} dir={clockDir(clock)} value={value.time} onChange={(e) => onChange({ time: e.target.value })}>
              <ClockOptions times={times} />
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
