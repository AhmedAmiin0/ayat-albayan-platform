import { type CodeRoutes, RESEND_SECONDS } from '@ab/client-core';
import { loginCode, normalizePhone } from '@ab/shared';
import { useState } from 'react';
import { authApi } from '../forgot/auth-api';
import { authErrorText } from '../forgot/auth-errors';
import { useCountdown } from '../forgot/use-countdown';
import { signInWithCode } from '../sign-in';
import { t } from '../../lib/i18n/i18n';

/** The phone is only a lookup key; the code goes to the number on file (docs/46 A8, docs/50 §6). */
export function useCodeSignIn(codes: CodeRoutes = authApi.staffCodes) {
  const [phone, setPhone] = useState('');
  const [target, setTarget] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const timer = useCountdown();

  /** The refusal (also in `error`), or null: sent / signed in (the caller's haptic, docs/50). */
  const run = async (work: () => Promise<string | null>): Promise<string | null> => {
    setBusy(true);
    setError(null);
    const refused = await work().catch((e: unknown) => authErrorText(e, t.common.error));
    // On success the auth gate swaps the screen; stay busy till then.
    if (refused !== null) setBusy(false);
    setError(refused);
    return refused;
  };

  const send = (raw = phone) =>
    run(async () => {
      const parsed = normalizePhone(raw);
      if (!parsed.ok) return t.familyAuth.errors.invalid_phone;
      await codes.request(parsed.e164);
      setTarget(parsed.e164);
      timer.start(RESEND_SECONDS);
      setBusy(false);
      return null;
    });

  const verify = (code: string) =>
    run(async () => {
      const digits = loginCode.safeParse(code);
      if (!digits.success || target === null) return t.familyAuth.errors.code_incomplete;
      const res = await signInWithCode({ phone: target, code: digits.data }, codes);
      return res.ok ? null : res.error;
    });

  const changePhone = () => {
    setTarget(null);
    setError(null);
  };

  return { phone, setPhone, target, error, busy, resendIn: timer.left, send, verify, changePhone };
}

export type CodeSignIn = ReturnType<typeof useCodeSignIn>;
