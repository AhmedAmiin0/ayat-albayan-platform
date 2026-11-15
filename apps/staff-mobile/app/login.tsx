import { useState } from 'react';
import { ForgotPassword, PasswordSignIn, SignInFrame, t, Button } from '@ab/mobile-kit';
import { TeacherCodeSignIn, useStaffCodes } from '@/core/auth';

/**
 * password: identifier + password; code: a teacher's WhatsApp code (docs/46 A8); forgot: the reset.
 */
type Mode = 'password' | 'code' | 'forgot';

// The error is the §10 inline alert (docs/07): danger-soft, struck glyph, word.
export default function Login() {
  const [mode, setMode] = useState<Mode>('password');
  const codes = useStaffCodes();
  const toPassword = () => setMode('password');

  return (
    <SignInFrame title={t.auth.loginTitle}>
      {mode === 'forgot' ? <ForgotPassword onBack={toPassword} /> : null}
      {mode === 'code' ? <TeacherCodeSignIn onBack={toPassword} /> : null}
      {mode === 'password' ? (
        <PasswordSignIn label={t.auth.email}>
          {codes ? (
            <Button
              variant="ghost"
              label={t.teacherAuth.withCode}
              onPress={() => setMode('code')}
            />
          ) : null}
          <Button variant="ghost" label={t.familyAuth.forgot} onPress={() => setMode('forgot')} />
        </PasswordSignIn>
      ) : null}
    </SignInFrame>
  );
}
