import { useState, type SubmitEvent } from 'react';
import { Field } from '@/components/ui/form/field';
import { FormAlert } from '@/components/ui/form/form-alert';
import { Input } from '@/components/ui/form/input';
import { Ltr } from '@/components/ui/display/ltr';
import { t } from '@/lib/i18n/i18n';
import { emailErrors } from '@/features/people/account/account-validation';
import { AccountSection } from './AccountSection';
import { changeEmail } from '@/features/people/account/api';
import { PasswordField } from './PasswordField';
import { SaveButton } from '@/features/people/account/SaveButton';
import type { SectionProps } from './section-props';
import { useAccountSave } from '@/features/people/account/use-account-save';

const M = t.account.email;

/** «البريد الحالي: x@y.z», the address an LTR island inside the sentence (docs/07 §14.4). */
function CurrentEmail({ email }: { email: string }) {
  const [before, after = ''] = M.current.split('{email}');
  return (
    <p className="text-sm text-pretty text-ink-2">
      {before}
      <Ltr>{email}</Ltr>
      {after}
    </p>
  );
}

/** R-ACC-03: the sign-in email, confirmed with the current password; the next sign-in uses it. */
export function EmailSection({ profile, onDone }: SectionProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const clear = () => {
    setEmail('');
    setPassword('');
  };
  const save = useAccountSave({ save: changeEmail, toast: t.account.toast.email, onDone, refreshAuth: true, onSaved: clear });
  const submit = (e: SubmitEvent) => {
    e.preventDefault();
    const found = emailErrors({ email, password });
    save.setErrors(found);
    if (Object.keys(found).length === 0) save.submit({ email: email.trim().toLowerCase(), current_password: password });
  };
  return (
    <AccountSection title={M.title}>
      <form className="grid gap-4" onSubmit={submit} noValidate>
        {profile.email && <CurrentEmail email={profile.email} />}
        <Field label={M.label} hint={M.hint} error={save.errors.email} required>
          {(p) => <Input {...p} type="email" dir="ltr" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />}
        </Field>
        <PasswordField value={password} onValue={setPassword} error={save.errors.current_password} />
        {save.errors.form && <FormAlert>{save.errors.form}</FormAlert>}
        <SaveButton pending={save.pending} disabled={email.trim() === ''} />
      </form>
    </AccountSection>
  );
}
