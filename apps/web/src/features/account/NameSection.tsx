import { ACCOUNT_NAME_MAX, ACCOUNT_NAME_MIN } from '@ab/shared';
import { useState, type FormEvent } from 'react';
import { Field } from '@/components/ui/field';
import { FormAlert } from '@/components/ui/form-alert';
import { Input } from '@/components/ui/input';
import { t } from '@/lib/i18n';
import { nameErrors } from './account-validation';
import { AccountSection } from './AccountSection';
import { updateProfile } from './api';
import { SaveButton } from './SaveButton';
import { useAccountSave } from './use-account-save';
import type { SectionProps } from './section-props';

const N = t.account.name;
const HINT = N.hint.replace('{min}', String(ACCOUNT_NAME_MIN)).replace('{max}', String(ACCOUNT_NAME_MAX));

/** R-ACC-02: the user's own full name (no password needed). */
export function NameSection({ profile, onDone }: SectionProps) {
  const [name, setName] = useState(profile.full_name);
  const save = useAccountSave({ save: updateProfile, toast: t.account.toast.name, onDone });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const found = nameErrors(name);
    save.setErrors(found);
    if (Object.keys(found).length === 0) save.submit({ full_name: name.trim() });
  };
  return (
    <AccountSection title={N.title}>
      <form className="grid gap-4" onSubmit={submit} noValidate>
        <Field label={N.label} hint={HINT} error={save.errors.full_name} required>
          {(p) => <Input {...p} value={name} autoComplete="name" maxLength={ACCOUNT_NAME_MAX + 20} onChange={(e) => setName(e.target.value)} />}
        </Field>
        {save.errors.form && <FormAlert>{save.errors.form}</FormAlert>}
        <SaveButton pending={save.pending} disabled={name.trim() === profile.full_name} />
      </form>
    </AccountSection>
  );
}
