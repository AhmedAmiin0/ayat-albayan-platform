import { RESEND_SECONDS } from '@ab/client-core';
import { loginCode, normalizePhone } from '@ab/shared';
import { useState } from 'react';
import { authApi, authErrorText, useCountdown } from '@/core/auth/forgot';
import { signInWithCode } from '@/core/auth/sign-in';
import { t } from '@/core/lib/i18n/i18n';

/**
 * The teacher's «الدخول برمز واتساب» (docs/46 A8): phone → 6-digit code → session. The phone is
 * only a lookup key (the code goes to the number on file); `target` holds the normalised one.
 */
export function useCodeSignIn() {
  const [phone, setPhone] = useState('');
  const [target, setTarget] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const timer = useCountdown();

  const run = async (work: () => Promise<string | null>) => {
    setBusy(true);
    setError(null);
    const refused = await work().catch((e: unknown) => authErrorText(e, t.common.error));
    // On success the auth gate swaps the screen; stay busy till then.
    if (refused !== null) setBusy(false);
    setError(refused);
  };

  const send = (raw = phone) =>
    run(async () => {
      const parsed = normalizePhone(raw);
      if (!parsed.ok) return t.familyAuth.errors.invalid_phone;
      await authApi.staffCodes.request(parsed.e164);
      setTarget(parsed.e164);
      timer.start(RESEND_SECONDS);
      setBusy(false);
      return null;
    });

  const verify = (code: string) =>
    run(async () => {
      const digits = loginCode.safeParse(code);
      if (!digits.success || target === null) return t.familyAuth.errors.code_incomplete;
      const res = await signInWithCode({ phone: target, code: digits.data });
      return res.ok ? null : res.error;
    });

  const changePhone = () => {
    setTarget(null);
    setError(null);
  };

  return { phone, setPhone, target, error, busy, resendIn: timer.left, send, verify, changePhone };
}

export type CodeSignIn = ReturnType<typeof useCodeSignIn>;
