import { Field, Input } from '@ab/web-kit';

export interface TextFieldProps {
  label: string;
  value: string;
  onValue: (value: string) => void;
  /** Marks the field invalid with this sentence. */
  error?: string;
  inputMode?: 'numeric' | 'tel';
  /** One line under the field: what it is for. */
  hint?: string;
}

/** One labelled text input of the people edit forms. */
export function TextField({ label, value, onValue, error, inputMode, hint }: TextFieldProps) {
  return (
    <Field label={label} error={error} hint={hint}>
      {(p) => (
        <Input
          {...p}
          value={value}
          inputMode={inputMode}
          onChange={(e) => onValue(e.target.value)}
        />
      )}
    </Field>
  );
}
