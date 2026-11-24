import { Field } from '@ab/web-kit/components/ui/form/field';
import { controlClass } from '@ab/web-kit/components/ui/form/input';
import { cn } from '@ab/web-kit/lib/utils';

export interface ReportTextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  /** The Google Form required it (REPORT_REQUIRED_TEXT) and the student attended. */
  required?: boolean;
  error?: string | undefined;
  placeholder?: string;
}

/** A free-text report line that grows with the text, 4000 characters max. */
export function ReportTextField({ label, value, onChange, disabled, required, error, placeholder }: ReportTextFieldProps) {
  return (
    <Field label={label} error={error} required={required}>
      {(control) => (
        <textarea
          {...control}
          required={required}
          rows={2}
          maxLength={4000}
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className={cn(controlClass, 'field-sizing-content min-h-20 py-2 leading-relaxed sm:min-h-20')}
        />
      )}
    </Field>
  );
}
