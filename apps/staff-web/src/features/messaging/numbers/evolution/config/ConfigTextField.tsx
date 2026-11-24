import { Field } from '@ab/web-kit/components/ui/form/field';
import { Input } from '@ab/web-kit/components/ui/form/input';

export interface ConfigTextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  error?: string;
  /** Hosts, URLs, ids and numbers: left to right, monospace, no spell check. */
  ltr?: boolean;
  /** Whole numbers only: the numeric keypad on phones. */
  numeric?: boolean;
}

export function ConfigTextField(props: ConfigTextFieldProps) {
  const { label, value, onChange, hint, error, ltr = false, numeric = false } = props;
  return (
    <Field label={label} hint={hint} error={error}>
      {(p) => (
        <Input
          {...p}
          dir={ltr || numeric ? 'ltr' : undefined}
          spellCheck={!ltr}
          inputMode={numeric ? 'numeric' : undefined}
          className={ltr ? 'font-mono' : undefined}
          value={value}
          onChange={(ev) => onChange(ev.target.value)}
        />
      )}
    </Field>
  );
}
