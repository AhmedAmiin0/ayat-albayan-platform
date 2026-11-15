import { type ReactNode, useState } from 'react';
import { t } from '../../lib/i18n/i18n';
import { Field } from '../../ui/form/Field';
import { Button } from '../../ui/primitives/Button';
import { AuthAlert } from '../forgot/AuthAlert';
import { AuthHint } from '../forgot/AuthHint';
import { setLoginNotice, useLoginNotice } from '../login-notice';
import { signIn } from '../sign-in';

interface PasswordSignInProps {
  /** The identifier's label: «البريد الإلكتروني…» (staff) or «كود الطالب» (family app). */
  label: string;
  /** A quiet line under the identifier. */
  hint?: string;
  /** Under the button: other ways in, «نسيت كلمة السر؟». */
  children?: ReactNode;
}

/**
 * Identifier + password → signIn (docs/30 §5), with the inline alert: the refusal, else why the
 * last session ended (account disabled, wrong app). On success the auth gate swaps the screen
 * (Stack.Protected); the form stays busy till then. The staff login and the family app's student.
 */
export function PasswordSignIn({ label, hint, children }: PasswordSignInProps) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const notice = useLoginNotice();
  const alert = error ?? notice;

  const submit = async () => {
    setBusy(true);
    setError(null);
    setLoginNotice(null);
    const res = await signIn({ identifier: identifier.trim(), password });
    if (res.ok) return;
    setBusy(false);
    setError(res.error);
  };

  return (
    <>
      <Field
        label={label}
        ltr
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="username"
        textContentType="username"
        value={identifier}
        onChangeText={setIdentifier}
      />
      {hint ? <AuthHint text={hint} /> : null}
      <Field
        label={t.auth.password}
        secureTextEntry
        autoComplete="current-password"
        value={password}
        onChangeText={setPassword}
      />
      {alert ? <AuthAlert text={alert} /> : null}
      <Button label={busy ? t.auth.submitting : t.auth.submit} onPress={submit} busy={busy} />
      {children}
    </>
  );
}
