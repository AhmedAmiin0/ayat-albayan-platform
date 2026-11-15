import { Field } from '@/components/ui/form/field';
import { Input } from '@/components/ui/form/input';

export interface TextFieldProps {
  label: string;
  value: string;
  onValue: (value: string) => void;
  /** Marks the field invalid with this sentence. */
  error?: string;
  inputMode?: 'numeric' | 'tel';
}

/** One labelled text input of the people edit forms. */
export function TextField({ label, value, onValue, error, inputMode }: TextFieldProps) {
  return (
    <Field label={label} error={error}>
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
