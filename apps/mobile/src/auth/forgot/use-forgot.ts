import { useEffect, useState } from 'react';
import { RESEND_SECONDS } from '@ab/client-core';
import { loginCode } from '@ab/shared';
import { t } from '@/core/lib/i18n/i18n';
import { authApi } from './auth-api';
import { authErrorText } from './auth-errors';
import { useCountdown } from './use-countdown';

/** checking → unavailable (codes off: ask the admins) | identifier → code → done. */
type ForgotStep = 'checking' | 'unavailable' | 'identifier' | 'code' | 'done';

interface NewPassword {
  code: string;
  password: string;
  confirm: string;
}

/** «نسيت كلمة المرور؟» (docs/30 §7): identifier → WhatsApp code → new password. */
export function useForgot() {
  const [step, setStep] = useState<ForgotStep>('checking');
  const [identifier, setIdentifier] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const timer = useCountdown();

  useEffect(() => {
    let live = true;
    authApi.codeStatus().then(
      (s) => live && setStep(s.available ? 'identifier' : 'unavailable'),
      () => live && setStep('unavailable'),
    );
    return () => void (live = false);
  }, []);

  const run = async (work: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await work();
    } catch (e) {
      setError(authErrorText(e, t.common.error));
    } finally {
      setBusy(false);
    }
  };

  const send = () =>
    run(async () => {
      await authApi.forgot({ identifier: identifier.trim() });
      setStep('code');
      timer.start(RESEND_SECONDS);
    });

  const reset = async ({ code, password, confirm }: NewPassword) => {
    // Arabic-Indic digits and spaces fold the way the API folds them (a pasted «١٢٣ ٤٥٦» works).
    const digits = loginCode.safeParse(code);
    if (!digits.success) return setError(t.familyAuth.errors.code_incomplete);
    if (password !== confirm) return setError(t.familyAuth.passwordsDiffer);
    await run(async () => {
      await authApi.reset({ identifier: identifier.trim(), code: digits.data, password });
      setStep('done');
    });
  };

  return { step, identifier, setIdentifier, error, busy, resendIn: timer.left, send, reset };
}

export type Forgot = ReturnType<typeof useForgot>;
