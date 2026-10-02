import { GRADES, gradeStyle, type Grade } from '@ab/shared';
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
}

/**
 * One rubric (R-REP-02): five native radios drawn as grade pips (gradeStyle, ordinal so it reads
 * in greyscale), ممتاز first; the chosen word is spelled out beside them. Arrow keys move.
 */
export function GradePicker({ name, label, value, onChange, disabled, emphasis }: GradePickerProps) {
  return (
    <fieldset className="grid gap-1.5 border-b border-rule py-2.5 last:border-b-0 sm:grid-cols-[12rem_1fr] sm:items-center" disabled={disabled}>
      <legend className={cn('float-start text-sm text-ink-2', emphasis && 'font-display text-body font-bold text-ink')}>{label}</legend>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <div className="inline-flex gap-1">
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
                className={cn(
                  'grid min-h-11 min-w-11 place-items-center rounded-md border border-rule px-2 text-ink-3 sm:min-h-9',
                  'peer-checked:border-primary peer-checked:bg-lapis-wash peer-checked:text-ink',
                  'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring',
                  'hover:bg-sunk peer-disabled:cursor-not-allowed peer-disabled:opacity-60',
                )}
              >
                <GradePips pips={gradeStyle[g].pips} />
              </span>
            </label>
          ))}
        </div>
        <span className={cn('text-sm', value ? 'font-semibold text-ink' : 'text-ink-3')}>
          {value ? t.enums.grade[value] : t.reports.chart.noGrade}
        </span>
      </div>
    </fieldset>
  );
}
