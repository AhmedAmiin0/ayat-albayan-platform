import type { CancelBy } from '@ab/shared';
import { t } from '@/lib/i18n/i18n';

export interface CancelByRadiosProps {
  options: readonly CancelBy[];
  value: CancelBy;
  onChange: (by: CancelBy) => void;
}

/** «من الذي ألغى؟»: the teacher, the admin or the student (an excuse), as the form offers them. */
export function CancelByRadios({ options, value, onChange }: CancelByRadiosProps) {
  return (
    <fieldset className="grid gap-1">
      <legend className="mb-1 text-xs font-semibold text-ink-2">{t.lessons.cancelBy}</legend>
      {options.map((x) => (
        <label key={x} className="flex min-h-11 items-center gap-2 text-sm sm:min-h-9">
          <input
            type="radio"
            name="cancel-by"
            checked={value === x}
            onChange={() => onChange(x)}
            className="size-4 accent-[var(--lapis)]"
          />
          <span>{t.lessons.by[x]}</span>
        </label>
      ))}
    </fieldset>
  );
}
