import { type ReactNode, useState } from 'react';
import { t } from '../../../lib/i18n/i18n';
import { Field } from '../../../ui/form/Field';
import { Button } from '../../../ui/primitives/Button';
import { AuthAlert } from '../../forgot/AuthAlert';
import { AuthHint } from '../../forgot/AuthHint';
import { setLoginNotice, useLoginNotice } from '../../login-notice';
import { signIn } from '../../sign-in';

type Check = (identifier: string) => string | null;

/** What is wrong with the typed identifier by the app's own check, or null (nothing typed). */
const typoOf = (typed: string, check: Check | undefined): string | null =>
  typed === '' || !check ? null : check(typed);

const ignore = (_ok: boolean) => undefined;

interface IdentifierProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** The quiet hint, or (red) what is wrong. */
  note: { text: string; bad: boolean } | null;
}

/** The identifier (LTR, the OS's username autofill) and the line under it. */
function Identifier({ label, value, onChange, note }: IdentifierProps) {
  return (
    <>
      <Field
        label={label}
        ltr
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="username"
        textContentType="username"
        value={value}
        onChangeText={onChange}
      />
      {note ? <AuthHint text={note.text} tone={note.bad ? 'bad' : 'quiet'} /> : null}
    </>
  );
}

interface PasswordSignInProps {
  label: string;
  /** A quiet line under the identifier. */
  hint?: string;
  children?: ReactNode;
  /** While typing: why the identifier cannot be right (shown; the button waits), or null. */
  check?: Check;
  /** After each try: signed in or refused (the family app's haptic). */
  onResult?: (ok: boolean) => void;
}

/**
 * Identifier + password → signIn (docs/30 §5), with the inline alert: the refusal, else why the
 * last session ended (account disabled, wrong app). On success the auth gate swaps the screen
 * (Stack.Protected); the form stays busy till then. The staff login and the family app's student.
 */
export function PasswordSignIn({ label, hint, children, ...more }: PasswordSignInProps) {
  const onResult = more.onResult ?? ignore;
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const notice = useLoginNotice();
  const alert = error ?? notice;
  const typo = typoOf(identifier.trim(), more.check);
  const note = typo ?? hint;

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

  return (
    <>
      <Identifier
        label={label}
        value={identifier}
        onChange={setIdentifier}
        note={note === undefined ? null : { text: note, bad: typo !== null }}
      />
      <Field
        label={t.auth.password}
        secureTextEntry
        autoComplete="current-password"
        value={password}
        onChangeText={setPassword}
      />
      {alert ? <AuthAlert text={alert} /> : null}
      <Button
        label={busy ? t.auth.submitting : t.auth.submit}
        onPress={submit}
        busy={busy}
        disabled={typo !== null}
      />
      {children}
    </>
  );
}
