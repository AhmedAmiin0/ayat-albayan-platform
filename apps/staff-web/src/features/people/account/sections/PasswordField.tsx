import { Field, PasswordInput, t } from '@ab/web-kit';

export interface PasswordFieldProps {
  value: string;
  onValue: (value: string) => void;
  error?: string;
  /** The default is the current-password identity check of R-ACC-02..04. */
  label?: string;
  hint?: string;
  fresh?: boolean;
}

export function PasswordField({ value, onValue, error, label, hint, fresh }: PasswordFieldProps) {
  const current = label === undefined;
  return (
    <Field
      label={label ?? t.account.currentPassword}
      hint={current ? t.account.currentPasswordHint : hint}
      error={error}
      required
    >
      {(p) => (
        <PasswordInput
          {...p}
          value={value}
          onValue={onValue}
          autoComplete={fresh ? 'new-password' : 'current-password'}
        />
      )}
    </Field>
  );
}
