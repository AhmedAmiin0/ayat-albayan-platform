import { studentCodeOnTrack } from '@ab/client-core';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { signIn } from '@ab/web-kit/auth/sign-in';
import { useLandAfterSignIn } from '@ab/web-kit/auth/use-return-to';
import { t } from '@ab/web-kit/lib/i18n/i18n';

/** docs/50 §4: the student code is checked while typed with the server's own rule. */
export function useStudentSignIn() {
  const queryClient = useQueryClient();
  const land = useLandAfterSignIn();
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Nothing typed yet says nothing: the hint above already shows what a code looks like.
  const quiet = code.trim() === '' || studentCodeOnTrack(code);
  const codeProblem = quiet ? undefined : t.familyApp.signIn.studentCodeBad;
  const ready = code.trim() !== '' && password !== '' && codeProblem === undefined;

  const submit = async () => {
    if (!ready || busy) return;
    setBusy(true);
    setError(null);
    const result = await signIn({ email: code.trim(), password }, queryClient).catch(
      () => ({ ok: false, error: t.common.error }) as const,
    );
    setBusy(false);
    if (result.ok) await land('/portal');
    else setError(result.error);
  };
  return { code, setCode, password, setPassword, codeProblem, error, busy, ready, submit };
}
