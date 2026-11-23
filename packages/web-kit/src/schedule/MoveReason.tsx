import { Field, controlClass } from '#/components/ui/form/index.ts';
import { t } from '#/lib/i18n/index.ts';
import { cn } from '#/lib/index.ts';

/** The API's limit for a move reason (packages/schedule moveReasonSchema). */
const MAX = 500;

export interface MoveReasonProps {
  value: string;
  onChange: (value: string) => void;
  /** Default «سبب تغيير الموعد (اختياري)»; the family's or the answer's own words otherwise. */
  label?: string;
  /** Default: the teacher reads it in the student file. */
  hint?: string;
  /** An example of what to write («مثلًا: …»). */
  placeholder?: string;
}

/**
 * «سبب تغيير الموعد (اختياري)» on a one-lesson move (docs/47, owner call 4): free text the teacher
 * reads in the student file, said so under the field.
 */
export function MoveReason({ value, onChange, label, hint, placeholder }: MoveReasonProps) {
  return (
    <Field label={label ?? t.reschedule.reason} hint={hint ?? t.reschedule.reasonHint}>
      {(control) => (
        <textarea
          {...control}
          rows={2}
          maxLength={MAX}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(controlClass, 'field-sizing-content min-h-16 py-2 leading-relaxed')}
        />
      )}
    </Field>
  );
}
