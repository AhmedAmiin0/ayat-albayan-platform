import { GRADES, gradeStyle, type Grade } from '@ab/shared';
import { RequiredMark } from '@/components/ui/label';
import { GradePips } from '@/components/ui/nuqta-glyph';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export interface GradePickerProps {
  /** Radio group name, unique on the page (report id + rubric). */
  name: string;
  label: string;
  value: Grade | null;
  onChange: (grade: Grade) => void;
  disabled?: boolean;
  /** The overall grade reads larger (docs/07 §13 overall box). */
  emphasis?: boolean;
  /** missing_grades from the last submit attempt, while this row is still empty. */
  invalid?: boolean;
  /** The «*» mark: required once the student attended. */
  required?: boolean;
}

/**
 * One rubric (R-REP-02): five native radios drawn as grade pips (gradeStyle, ordinal so it reads
 * in greyscale) with the grade word under them (12px, never counted from dots), ممتاز first.
 * Arrow keys move.
 */
export function GradePicker({ name, label, value, onChange, disabled, emphasis, invalid, required }: GradePickerProps) {
  return (
    <fieldset
      disabled={disabled}
      aria-invalid={invalid || undefined}
      className={cn(
        'grid gap-1.5 border-b border-rule py-2.5 last:border-b-0 sm:grid-cols-[12rem_1fr] sm:items-center',
        invalid && 'border-s-[3px] border-s-danger ps-2',
      )}
    >
      <legend className={cn('float-start text-sm text-ink-2', emphasis && 'font-display text-body font-bold text-ink')}>
        {label}
        {required && <RequiredMark />}
      </legend>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <div className="grid w-full grid-cols-5 gap-1 sm:inline-flex sm:w-auto">
          {GRADES.map((g) => (
            <label key={g} title={t.enums.grade[g]} className="cursor-pointer">
              <input
                type="radio"
                name={name}
                value={g}
                checked={value === g}
                onChange={() => onChange(g)}
                aria-label={t.enums.grade[g]}
                className="peer sr-only"
              />
              <span
                aria-hidden
                className={cn(
                  'grid min-h-11 place-items-center content-center gap-0.5 rounded-md border border-rule px-0.5 py-1 text-ink-3 sm:min-h-9 sm:min-w-11 sm:px-2',
                  '[&_svg]:size-[7px] sm:[&_svg]:size-[9px]',
                  'peer-checked:border-primary peer-checked:bg-lapis-wash peer-checked:text-ink',
                  'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring',
                  'hover:bg-sunk peer-disabled:cursor-not-allowed peer-disabled:opacity-60',
                )}
              >
                <GradePips pips={gradeStyle[g].pips} />
                <span className="text-center text-2xs leading-tight text-balance">{t.enums.grade[g]}</span>
              </span>
            </label>
          ))}
        </div>
        {!value && <span className="text-sm text-ink-3">{t.reports.chart.noGrade}</span>}
      </div>
    </fieldset>
  );
}
