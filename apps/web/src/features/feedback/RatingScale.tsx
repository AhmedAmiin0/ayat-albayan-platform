import { RequiredMark } from '@/components/ui/form/label';
import { t } from '@/lib/i18n/i18n';
import { cn } from '@/lib/utils';
import { RATINGS, type Rating } from './types';

export interface RatingScaleProps {
  value: Rating | null;
  onChange: (value: Rating) => void;
  /** The last send found it empty. */
  invalid?: boolean;
}

/**
 * «تقييمك للحلقة *»: the form's 1–5 scale with its two end labels (غير راضٍ ← راضٍ تمامًا). Five
 * native radios (arrow keys, one tab stop) styled as 48px circles, so a thumb hits them on a phone.
 */
export function RatingScale({ value, onChange, invalid }: RatingScaleProps) {
  return (
    <fieldset aria-invalid={invalid || undefined} className="grid gap-2">
      <legend className="mb-1 text-sm font-semibold">
        {t.feedback.rating}
        <RequiredMark />
      </legend>
      <div className="flex items-center justify-between gap-2">
        {RATINGS.map((n) => (
          <label key={n} className="cursor-pointer">
            <input
              type="radio"
              name="feedback-rating"
              value={n}
              checked={value === n}
              onChange={() => onChange(n)}
              aria-label={t.feedback.rowRating.replace('{n}', String(n))}
              className="peer sr-only"
            />
            <span
              aria-hidden="true"
              className={cn(
                'grid size-12 place-items-center rounded-full border text-base font-semibold tabular-nums text-ink-2',
                invalid ? 'border-danger' : 'border-input',
                'peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground',
                'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring hover:bg-sunk',
              )}
            >
              {n}
            </span>
          </label>
        ))}
      </div>
      <div className="flex justify-between text-xs text-ink-3">
        <span>{t.feedback.ratingLow}</span>
        <span>{t.feedback.ratingHigh}</span>
      </div>
    </fieldset>
  );
}
