import { useState } from 'react';
import { t } from '../lib/i18n/i18n';
import { changePassword } from './account-api';
import { passwordChecks } from './password-checks';
import { useAccountAction } from './use-account-action';

/** R-ACC-04: checked here, then PUT /me/password. */
export function usePasswordForm() {
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
    const sendable = Object.keys(found).length === 0;
    if (sendable) action.submit({ current_password: current, new_password: next });
    else action.reject(found);
  };
  const empty = current === '' && next === '' && confirm === '';
  const values = { current, next, confirm };
  return { values, setCurrent, setNext, setConfirm, action, save, empty };
}
