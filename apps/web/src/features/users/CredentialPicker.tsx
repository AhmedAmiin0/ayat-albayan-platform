import { CREDENTIAL_MODES, DEFAULT_PASSWORD_MIN, type CredentialMode } from '@ab/shared';
import { Field } from '@/components/ui/form/field';
import { RadioChips } from '@/components/ui/form/radio-chips';
import { PasswordInput } from '@/features/auth/PasswordInput';
import { t } from '@/lib/i18n';

const C = t.users.credential;

export interface CredentialPickerProps {
  /** Radio group name, unique per form. */
  name: string;
  mode: CredentialMode;
  password: string;
  onMode: (mode: CredentialMode) => void;
  onPassword: (password: string) => void;
  error?: string | undefined;
}

/** How the user gets a password: typed here, generated (shown once) or an invite link (shown once). */
export function CredentialPicker({ name, mode, password, onMode, onPassword, error }: CredentialPickerProps) {
  return (
    <div className="grid gap-3">
      <RadioChips
        name={name}
        legend={C.label}
        options={CREDENTIAL_MODES.map((m) => ({ value: m, label: C[m] }))}
        value={mode}
        onChange={onMode}
      />
      {mode === 'set' && (
        <Field label={C.password} required error={error} hint={C.hint.replace('{n}', String(DEFAULT_PASSWORD_MIN))}>
          {(p) => <PasswordInput {...p} autoComplete="new-password" value={password} onValue={onPassword} />}
        </Field>
      )}
    </div>
  );
}
