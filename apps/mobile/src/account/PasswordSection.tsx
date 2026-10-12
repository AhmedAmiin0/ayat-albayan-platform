import { DEFAULT_PASSWORD_MIN } from '@ab/shared';
import { useState } from 'react';
import { t } from '@/lib/i18n';
import { changePassword } from './account-api';
import { AccountCard } from './AccountCard';
import { AccountField, passwordInput } from './AccountField';
import { passwordChecks } from './password-checks';
import { useAccountAction } from './use-account-action';

const hint = t.account.password.hint.replace('{n}', String(DEFAULT_PASSWORD_MIN));

/** «كلمة السر» (R-ACC-04): current, new, confirm. The session stays signed in. */
export function PasswordSection() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const action = useAccountAction({
    run: changePassword,
    success: t.account.toast.password,
    onDone: () => {
      setCurrent('');
      setNext('');
      setConfirm('');
    },
  });

  const save = () => {
    const found = passwordChecks({ current, next, confirm });
    if (Object.keys(found).length > 0) return action.reject(found);
    action.submit({ current_password: current, new_password: next });
  };

  return (
    <AccountCard
      title={t.account.password.title}
      onSave={save}
      pending={action.pending}
      disabled={current === '' && next === '' && confirm === ''}
      error={action.errors.form}
      notice={action.notice}
    >
      <AccountField
        {...passwordInput(t.account.currentPassword)}
        value={current}
        onChangeText={setCurrent}
        error={action.errors.current_password}
      />
      <AccountField
        {...passwordInput(t.account.password.new)}
        autoComplete="new-password"
        textContentType="newPassword"
        value={next}
        onChangeText={setNext}
        hint={hint}
        error={action.errors.new_password}
      />
      <AccountField
        {...passwordInput(t.account.password.confirm)}
        autoComplete="new-password"
        textContentType="newPassword"
        value={confirm}
        onChangeText={setConfirm}
        error={action.errors.confirm}
      />
    </AccountCard>
  );
}
