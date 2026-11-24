import { DEFAULT_PASSWORD_MIN } from '@ab/shared';
import { t } from '../lib/i18n/i18n';
import { AccountCard } from './AccountCard';
import { AccountField, passwordInput } from './AccountField';
import { usePasswordForm } from './use-password-form';

const hint = t.account.password.hint.replace('{n}', String(DEFAULT_PASSWORD_MIN));

/** R-ACC-04: the session stays signed in after a password change. */
export function PasswordSection() {
  const { values, setCurrent, setNext, setConfirm, action, save, empty } = usePasswordForm();
  return (
    <AccountCard
      title={t.account.password.title}
      onSave={save}
      pending={action.pending}
      disabled={empty}
      error={action.errors.form}
      notice={action.notice}
    >
      <AccountField
        {...passwordInput(t.account.currentPassword)}
        value={values.current}
        onChangeText={setCurrent}
        error={action.errors.current_password}
      />
      <AccountField
        {...passwordInput(t.account.password.new)}
        autoComplete="new-password"
        textContentType="newPassword"
        value={values.next}
        onChangeText={setNext}
        hint={hint}
        error={action.errors.new_password}
      />
      <AccountField
        {...passwordInput(t.account.password.confirm)}
        autoComplete="new-password"
        textContentType="newPassword"
        value={values.confirm}
        onChangeText={setConfirm}
        error={action.errors.confirm}
      />
    </AccountCard>
  );
}
