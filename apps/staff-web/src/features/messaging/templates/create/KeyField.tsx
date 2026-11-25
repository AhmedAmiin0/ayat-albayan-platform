import { Field, Input } from '@ab/web-kit';

export interface KeyFieldProps {
  label: string;
  hint: string;
  required?: boolean;
  value: string;
  onChange: (key: string) => void;
  error?: string;
}

/** The template's Meta name: Latin, left to right, never autocorrected. */
export function KeyField({ label, hint, required, value, onChange, error }: KeyFieldProps) {
  return (
    <Field label={label} hint={hint} required={required} error={error}>
      {(p) => (
        <Input
          {...p}
          dir="ltr"
          autoComplete="off"
          spellCheck={false}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </Field>
  );
}
