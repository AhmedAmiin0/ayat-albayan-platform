import { checkPhone, type Country, defaultCountry, splitInternational } from '@ab/client-core';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { codeOf, emptyCode } from '@ab/web-kit/auth/code/code-boxes';
import { type CodeFlow, useCodeFlow } from '@ab/web-kit/auth/code/use-code-flow';
import { authApi } from '@ab/web-kit/auth/login/auth-api';
import { signInWithCode } from '@ab/web-kit/auth/sign-in';
import { useLandAfterSignIn } from '@ab/web-kit/auth/use-return-to';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { browserRegion } from './phone/browser-country';

const F = t.familyAuth;
const sameCode = (a: readonly string[], b: readonly string[]) => a.join('') === b.join('');
const firstCountry = () => defaultCountry(browserRegion(navigator.language));

/**
 * «الدخول برقم الواتساب» (docs/50 §4), as the family app: the number (country + national,
 * checked while typing; a whole number pasted picks its country) → the six digits, the sixth
 * signing in without a tap → the session, then /portal (or the page the guard carried). A
 * refused code empties the boxes for the next try. A staff number lands on the guard's «wrongApp».
 */
export function useWhatsAppSignIn() {
  const queryClient = useQueryClient();
  const land = useLandAfterSignIn();
  const [country, setCountry] = useState<Country>(firstCountry);
  const [typed, setTyped] = useState('');
  const [refusals, setRefusals] = useState(0);
  const check = checkPhone(country, typed);
  const flow = useCodeFlow((e164) => authApi.familyCodes.request(e164));

  // A whole number pasted or autofilled («+44 7700…», «0044…»): its country, then the rest.
  const onTyped = (text: string) => {
    const split = splitInternational(text, country);
    setCountry(split?.country ?? country);
    setTyped(split?.national ?? text);
  };
  const send = () => {
    if (check.e164 === null) flow.setError(F.errors.invalid_phone);
    else void flow.request(check.e164);
  };
  // Only the refused code goes (digits typed meanwhile stay); `refusals` re-keys the boxes.
  const refuse = (digits: readonly string[]) => {
    flow.setDigits((now) => (sameCode(now, digits) ? emptyCode() : now));
    setRefusals((n) => n + 1);
  };
  const verify = (digits: readonly string[]) =>
    flow.guard(async () => {
      const code = codeOf(digits);
      if (code === null || flow.target === null) return F.errors.code_incomplete;
      const done = await signInWithCode({ phone: flow.target, code }, queryClient);
      if (!done.ok) {
        refuse(digits);
        return done.error;
      }
      await land('/portal');
      return undefined;
    });
  const isNewWhole = (digits: readonly string[]) =>
    codeOf(digits) !== null && !sameCode(digits, flow.digits) && !flow.busy;
  // The boxes hand over whole arrays: the sixth digit signs in.
  const setDigits: CodeFlow['setDigits'] = (next) => {
    flow.setDigits(next);
    if (Array.isArray(next) && isNewWhole(next)) void verify(next);
  };
  const code = { ...flow, setDigits };
  return {
    country, setCountry, typed, setTyped: onTyped, check, flow: code, refusals, send, verify,
  };
}

export type WhatsAppSignIn = ReturnType<typeof useWhatsAppSignIn>;
