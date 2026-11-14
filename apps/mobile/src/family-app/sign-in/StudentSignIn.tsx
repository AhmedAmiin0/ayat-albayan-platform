import { useState } from 'react';
import { ForgotPassword, PasswordSignIn } from '@/core/auth';
import { t } from '@/core/lib/i18n/i18n';
import { Button } from '@/core/ui/primitives/Button';

/** password: student code + password; family (forgot) / firstTime: a code to the guardian. */
type StudentView = 'password' | 'family' | 'firstTime';

/**
 * A student signs in themselves (docs/50 §6): student code + password (POST /auth/login);
 * «أول دخول؟» sets the first password with a code sent to the guardian's phone; «نسيت كلمة السر؟»
 * resets it the same way (/auth/password/forgot | reset). Both hide while family codes are off.
 */
export function StudentSignIn({ codes }: { codes: boolean }) {
  const [view, setView] = useState<StudentView>('password');
  const toPassword = () => setView('password');
  if (view !== 'password') return <ForgotPassword key={view} mode={view} onBack={toPassword} />;
  return (
    <PasswordSignIn label={t.familyApp.signIn.studentCode} hint={t.familyAuth.studentUsernameHint}>
      {codes ? (
        <>
          <Button
            variant="ghost"
            label={t.familyAuth.firstTime}
            onPress={() => setView('firstTime')}
          />
          <Button variant="ghost" label={t.familyAuth.forgot} onPress={() => setView('family')} />
        </>
      ) : null}
    </PasswordSignIn>
  );
}
