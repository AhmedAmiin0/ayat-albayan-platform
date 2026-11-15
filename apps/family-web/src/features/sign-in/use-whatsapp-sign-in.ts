import { checkPhone, type Country } from '@ab/client-core';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { codeOf } from '@ab/web-kit/auth/code/code-boxes';
import { useCodeFlow } from '@ab/web-kit/auth/code/use-code-flow';
import { authApi } from '@ab/web-kit/auth/login/auth-api';
import { signInWithCode } from '@ab/web-kit/auth/sign-in';
import { useLandAfterSignIn } from '@ab/web-kit/auth/use-return-to';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { browserCountry } from './browser-country';

const F = t.familyAuth;

/**
 * «الدخول برقم الواتساب» (docs/50 §4): the number (country + national, checked while typing) →
 * the six digits → the session, then /portal (or the page the guard carried). A staff number
 * lands on the guard's «wrongApp».
 */
export function useWhatsAppSignIn() {
  const queryClient = useQueryClient();
  const land = useLandAfterSignIn();
  const [country, setCountry] = useState<Country>(() => browserCountry(navigator.language));
  const [typed, setTyped] = useState('');
  const check = checkPhone(country, typed);
  const flow = useCodeFlow((e164) => authApi.familyCodes.request(e164));

  const send = () => {
    if (check.e164 === null) flow.setError(F.errors.invalid_phone);
    else void flow.request(check.e164);
  };
  const verify = () =>
    flow.guard(async () => {
      const code = codeOf(flow.digits);
      if (code === null || flow.target === null) return F.errors.code_incomplete;
      const done = await signInWithCode({ phone: flow.target, code }, queryClient);
      if (!done.ok) return done.error;
      await land('/portal');
      return undefined;
    });
  return { country, setCountry, typed, setTyped, check, flow, send, verify };
}

export type WhatsAppSignIn = ReturnType<typeof useWhatsAppSignIn>;
