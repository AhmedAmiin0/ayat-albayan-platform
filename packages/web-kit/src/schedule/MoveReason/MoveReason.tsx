import { Field } from '@ab/web-kit/components/ui/form/Field';
import { controlClass } from '@ab/web-kit/components/ui/form/Input';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { cn } from '@ab/web-kit/lib/utils';
import type { MoveReasonProps } from './MoveReason.types';
import { MAX } from './move-reason.helpers';

/** docs/47: free text the teacher reads in the student file, said so under the field. */
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
