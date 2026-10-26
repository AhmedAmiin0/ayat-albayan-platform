import { STUDENT_STATUSES, type StudentStatus } from '@ab/shared';
import { cn } from '@/lib/utils';
import { t } from '@/lib/i18n/i18n';

export interface StatusChipsProps {
  value: readonly StudentStatus[];
  onToggle: (status: StudentStatus) => void;
  /** Per-status counts after the label, e.g. «مشترك ١٢». */
  counts?: Partial<Record<StudentStatus, number>> | undefined;
  legend?: string;
}

/** «الحالة» as checkbox chips: several at once; none checked = every status. */
export function StatusChips({ value, onToggle, counts, legend = t.students.status }: StatusChipsProps) {
  return (
    <fieldset className="flex flex-wrap items-center gap-2">
      <legend className="sr-only">{legend}</legend>
      {STUDENT_STATUSES.map((s) => (
        <label key={s} className="cursor-pointer">
          <input
            type="checkbox"
            checked={value.includes(s)}
            onChange={() => onToggle(s)}
            className="peer sr-only"
          />
          <span
            className={cn(
              'inline-flex min-h-11 items-center gap-1.5 rounded-full border border-input px-3.5 text-sm text-ink-2 sm:min-h-9',
              'peer-checked:border-primary peer-checked:bg-lapis-wash peer-checked:font-semibold peer-checked:text-ink',
              'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring hover:bg-sunk',
            )}
          >
            {t.enums.studentStatus[s]}
            {counts?.[s] !== undefined && <span className="tabular-nums text-ink-3">{counts[s]}</span>}
          </span>
        </label>
      ))}
    </fieldset>
  );
}
