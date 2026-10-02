import { Field } from '@/components/ui/field';
import { controlClass } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export interface ReportTextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  /** The Google Form required it (REPORT_REQUIRED_TEXT) and the student attended. */
  required?: boolean;
  error?: string | undefined;
}

/** A free-text line of the report (التسميع، الواجب، …): grows with the text, 4000 chars max. */
export function ReportTextField({ label, value, onChange, disabled, required, error }: ReportTextFieldProps) {
  return (
    <Field label={label} error={error}>
      {(control) => (
        <textarea
          {...control}
          required={required}
          aria-required={required || undefined}
          rows={2}
          maxLength={4000}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className={cn(controlClass, 'field-sizing-content min-h-20 py-2 leading-relaxed sm:min-h-20')}
        />
      )}
    </Field>
  );
}
