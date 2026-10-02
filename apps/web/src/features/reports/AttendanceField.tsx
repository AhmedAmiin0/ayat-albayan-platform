import { ATTENDANCES, type Attendance } from '@ab/shared';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export interface AttendanceFieldProps {
  name: string;
  value: Attendance | null;
  onChange: (value: Attendance) => void;
  disabled?: boolean;
  /** missing_attendance from the last submit attempt. */
  invalid?: boolean;
}

/** «الحضور» per student (R-REP-02): four native radios as chips; it decides the lesson outcome. */
export function AttendanceField({ name, value, onChange, disabled, invalid }: AttendanceFieldProps) {
  return (
    <fieldset disabled={disabled} aria-invalid={invalid || undefined} className="grid gap-2">
      <legend className="mb-2 font-display text-h3 font-bold">{t.reports.attendance}</legend>
      <div className="flex flex-wrap gap-2">
        {ATTENDANCES.map((a) => (
          <label key={a} className="cursor-pointer">
            <input
              type="radio"
              name={name}
              value={a}
              checked={value === a}
              onChange={() => onChange(a)}
              className="peer sr-only"
            />
            <span
              className={cn(
                'inline-flex min-h-12 items-center rounded-md border px-4 text-sm font-medium text-ink-2',
                invalid ? 'border-danger' : 'border-input',
                'peer-checked:border-primary peer-checked:bg-lapis-wash peer-checked:font-semibold peer-checked:text-ink',
                'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring',
                'hover:bg-sunk peer-disabled:cursor-not-allowed peer-disabled:opacity-60',
              )}
            >
              {t.enums.attendance[a]}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
