import { counted, type PackageSize } from '@ab/shared';
import { RequiredMark } from '@/components/ui/label';
import { WEEK_ORDER } from '@/features/teachers/grid';
import { t } from '@/lib/i18n';
import { PACKAGE_NOTE_CLASS, packageDaysNote } from './package-days';

export interface ByDayPickerProps {
  /** The first slot's weekday in the family zone: always on, can't be unticked. */
  fixed: number;
  /** Every repeat day, `fixed` included. */
  value: readonly number[];
  onChange: (days: number[]) => void;
  /** The package being booked: a note when the days don't add up to it (packageDaysNote). */
  pkg?: PackageSize;
}

const weekday: Record<string, string> = t.enums.weekday;

/** Weekly repeat «الأيام المتاحة» * (R-SCH-02 byday), السبت → الجمعة, at the first slot's time. */
export function ByDayPicker({ fixed, value, onChange, pkg }: ByDayPickerProps) {
  const note = pkg ? packageDaysNote(pkg, value.length) : null;
  const toggle = (day: number) =>
    onChange(value.includes(day) ? value.filter((d) => d !== day) : [...value, day].sort((a, b) => a - b));
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-1 text-sm font-semibold">
        {t.booking.pickDays}
        <RequiredMark />
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
      {note && <p className={PACKAGE_NOTE_CLASS}>{note}</p>}
    </fieldset>
  );
}
