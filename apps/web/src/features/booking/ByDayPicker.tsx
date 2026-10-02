import { counted } from '@ab/shared';
import { WEEK_ORDER } from '@/features/teachers/grid';
import { t } from '@/lib/i18n';

export interface ByDayPickerProps {
  /** The first slot's weekday in the family zone: always on, can't be unticked. */
  fixed: number;
  /** Every repeat day, `fixed` included. */
  value: readonly number[];
  onChange: (days: number[]) => void;
}

const weekday: Record<string, string> = t.enums.weekday;

/** Weekly repeat «أيام الحلقة» (R-SCH-02 byday), السبت → الجمعة, at the first slot's time. */
export function ByDayPicker({ fixed, value, onChange }: ByDayPickerProps) {
  const toggle = (day: number) =>
    onChange(value.includes(day) ? value.filter((d) => d !== day) : [...value, day].sort((a, b) => a - b));
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-1 text-sm font-semibold">
        {t.booking.pickDays}
        <span className="ms-2 text-xs font-normal text-ink-3">{counted(t.booking.perWeek, value.length)}</span>
      </legend>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {WEEK_ORDER.map((day) => (
          <label key={day} className="flex min-h-11 items-center gap-2 sm:min-h-8">
            <input
              type="checkbox"
              checked={day === fixed || value.includes(day)}
              disabled={day === fixed}
              onChange={() => toggle(day)}
              className="size-4 accent-[var(--lapis)]"
            />
            <span>{weekday[String(day)]}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
