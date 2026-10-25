import { Field } from '@/components/ui/form/field';
import { PasswordInput } from '@/features/auth/PasswordInput';
import { t } from '@/lib/i18n';

export interface PasswordFieldProps {
  value: string;
  onValue: (value: string) => void;
  error?: string;
  /** Defaults to «كلمة السر الحالية» with its hint (the identity check of R-ACC-02..04). */
  label?: string;
  hint?: string;
  fresh?: boolean;
}

/** A password input with «إظهار»: the current password by default, or a new one (`fresh`). */
export function PasswordField({ value, onValue, error, label, hint, fresh }: PasswordFieldProps) {
  const current = label === undefined;
  return (
    <Field label={label ?? t.account.currentPassword} hint={current ? t.account.currentPasswordHint : hint} error={error} required>
      {(p) => <PasswordInput {...p} value={value} onValue={onValue} autoComplete={fresh ? 'new-password' : 'current-password'} />}
    </Field>
  );
}
