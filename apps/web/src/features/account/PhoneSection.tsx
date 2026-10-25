import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/form/button';
import { Field } from '@/components/ui/form/field';
import { FormAlert } from '@/components/ui/form/form-alert';
import { Input } from '@/components/ui/form/input';
import { t } from '@/lib/i18n';
import { phoneErrors, phoneValue } from './account-validation';
import { AccountSection } from './AccountSection';
import { updateProfile } from './api';
import { PasswordField } from './PasswordField';
import { SaveButton } from './SaveButton';
import type { SectionProps } from './section-props';
import { useAccountSave } from './use-account-save';

const P = t.account.phone;

/** R-ACC-02: the user's own number (E.164; blank removes it), confirmed with the current password. */
export function PhoneSection({ profile, onDone }: SectionProps) {
  const saved = profile.phone_e164 ?? '';
  const [phone, setPhone] = useState(saved);
  const [password, setPassword] = useState('');
  const save = useAccountSave({ save: updateProfile, toast: t.account.toast.phone, onDone, onSaved: () => setPassword('') });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const found = phoneErrors({ phone, password });
    save.setErrors(found);
    const value = phoneValue(phone);
    if (Object.keys(found).length === 0 && value !== undefined) save.submit({ phone_e164: value, current_password: password });
  };
  return (
    <AccountSection title={P.title}>
      <form className="grid gap-4" onSubmit={submit} noValidate>
        <Field label={P.label} hint={P.hint} error={save.errors.phone_e164}>
          {(p) => (
            <div className="flex items-center gap-2">
              <Input {...p} type="tel" dir="ltr" inputMode="tel" autoComplete="tel" placeholder={P.none} value={phone} onChange={(e) => setPhone(e.target.value)} />
              {phone !== '' && (
                <Button type="button" variant="ghost" onClick={() => setPhone('')}>
                  {P.remove}
                </Button>
              )}
            </div>
          )}
        </Field>
        <PasswordField value={password} onValue={setPassword} error={save.errors.current_password} />
        {save.errors.form && <FormAlert>{save.errors.form}</FormAlert>}
        <SaveButton pending={save.pending} disabled={phone.trim() === saved} />
      </form>
    </AccountSection>
  );
}
