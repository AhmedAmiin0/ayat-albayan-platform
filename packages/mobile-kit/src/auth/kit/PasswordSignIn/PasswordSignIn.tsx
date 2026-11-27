import { t } from '../../../lib/i18n/i18n';
import { Field } from '../../../ui/form/Field';
import { Button } from '../../../ui/primitives/Button';
import { AuthAlert } from '../../forgot/AuthAlert';
import { Identifier } from './Identifier';
import type { PasswordSignInProps } from './PasswordSignIn.types';
import { usePasswordSignIn } from './use-password-sign-in';

/**
 * Identifier + password → signIn (docs/30 §5), with the inline alert: the refusal, else why the
 * last session ended (account disabled, wrong app). On success the auth gate swaps the screen
 * (Stack.Protected); the form stays busy till then. The staff login and the family app's student.
 */
export function PasswordSignIn({ label, children, ...more }: PasswordSignInProps) {
  const form = usePasswordSignIn(more);
  return (
    <>
      <Identifier
        label={label}
        value={form.identifier}
        onChange={form.setIdentifier}
        note={form.note}
      />
      <Field
        label={t.auth.password}
        secureTextEntry
        autoComplete="current-password"
        value={form.password}
        onChangeText={form.setPassword}
      />
      {form.alert ? <AuthAlert text={form.alert} /> : null}
      <Button
        label={form.submitLabel}
        onPress={form.submit}
        busy={form.busy}
        disabled={form.blocked}
      />
      {children}
    </>
  );
}
