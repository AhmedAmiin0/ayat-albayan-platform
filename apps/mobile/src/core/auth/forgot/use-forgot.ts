import { useEffect, useState } from 'react';
import { codesOpen, type CodesSide, RESEND_SECONDS } from '@ab/client-core';
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

/**
 * «نسيت كلمة المرور؟» (docs/30 §7): identifier → WhatsApp code → new password. `side`: whose codes
 * must be open (staff in the staff app; the family flag in the family app, docs/50 §6).
 */
export function useForgot(side: CodesSide = 'staff') {
  const [step, setStep] = useState<ForgotStep>('checking');
  const [identifier, setIdentifier] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const timer = useCountdown();

  useEffect(() => {
    let live = true;
    authApi.codeStatus().then(
      // Staff codes (docs/46 A1): whatever the family flag says; the family's: their own flag.
      (s) => live && setStep(codesOpen(s, side) ? 'identifier' : 'unavailable'),
      () => live && setStep('unavailable'),
    );
    return () => void (live = false);
  }, [side]);

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
