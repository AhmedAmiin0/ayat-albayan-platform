import { useState } from 'react';
import { t } from '../../../lib/i18n/i18n';
import { setLoginNotice, useLoginNotice } from '../../login-notice';
import { signIn } from '../../sign-in';
import { ignore, typoOf } from './password-sign-in.helpers';
import type { PasswordSignInProps } from './PasswordSignIn.types';

type Options = Pick<PasswordSignInProps, 'hint' | 'check' | 'onResult'>;

export function usePasswordSignIn({ hint, check, onResult = ignore }: Options) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const notice = useLoginNotice();
  const alert = error ?? notice;
  const typo = typoOf(identifier.trim(), check);
  const text = typo ?? hint;
  const note = text === undefined ? null : { text, bad: typo !== null };
  const submitLabel = busy ? t.auth.submitting : t.auth.submit;

  const submit = async () => {
    setBusy(true);
    setError(null);
    setLoginNotice(null);
    const res = await signIn({ identifier: identifier.trim(), password });
    onResult(res.ok);
    if (res.ok) return;
    setBusy(false);
    setError(res.error);
  };

  return {
    identifier,
    setIdentifier,
    password,
    setPassword,
    alert,
    busy,
    note,
    blocked: typo !== null,
    submitLabel,
    submit,
  };
}
