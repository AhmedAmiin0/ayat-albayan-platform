import { DEFAULT_PASSWORD_MIN } from '@ab/shared';
import { useState, type FormEvent } from 'react';
import { FormAlert } from '@/components/ui/form/form-alert';
import { t } from '@/lib/i18n/i18n';
import { passwordErrors, type PasswordForm } from '../account-validation';
import { AccountSection } from './AccountSection';
import { changePassword } from '../api';
import { PasswordField } from './PasswordField';
import { SaveButton } from '../SaveButton';
import type { SectionProps } from './section-props';
import { useAccountSave } from '../use-account-save';

const W = t.account.password;
const EMPTY: PasswordForm = { current: '', next: '', confirm: '' };

/** R-ACC-04: a new password (typed twice) for the current one; this session stays signed in. */
export function PasswordSection({ onDone }: Pick<SectionProps, 'onDone'>) {
  const [form, setForm] = useState<PasswordForm>(EMPTY);
  const set = (key: keyof PasswordForm) => (value: string) => setForm((f) => ({ ...f, [key]: value }));
  const save = useAccountSave({ save: changePassword, toast: t.account.toast.password, onDone, onSaved: () => setForm(EMPTY) });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const found = passwordErrors(form);
    save.setErrors(found);
    if (Object.keys(found).length === 0) save.submit({ current_password: form.current, new_password: form.next });
  };
  return (
    <AccountSection title={W.title}>
      <form className="grid gap-4" onSubmit={submit} noValidate>
        <PasswordField value={form.current} onValue={set('current')} error={save.errors.current_password} />
        <PasswordField
          label={W.new}
          hint={W.hint.replace('{n}', String(DEFAULT_PASSWORD_MIN))}
          value={form.next}
          onValue={set('next')}
          error={save.errors.new_password}
          fresh
        />
        <PasswordField label={W.confirm} value={form.confirm} onValue={set('confirm')} error={save.errors.confirm} fresh />
        {save.errors.form && <FormAlert>{save.errors.form}</FormAlert>}
        <SaveButton pending={save.pending} />
      </form>
    </AccountSection>
  );
}
