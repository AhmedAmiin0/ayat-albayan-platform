import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { codeOf, emptyCode } from '@ab/web-kit/auth/code/code-boxes';
import { type CodeFlow, useCodeFlow } from '@ab/web-kit/auth/code/use-code-flow';
import { authApi } from '@ab/web-kit/auth/login/auth-api';
import { usePhoneEntry } from '@ab/web-kit/auth/phone/use-phone-entry';
import { signInWithCode } from '@ab/web-kit/auth/sign-in';
import { useLandAfterSignIn } from '@ab/web-kit/auth/use-return-to';
import { t } from '@ab/web-kit/lib/i18n/i18n';

const F = t.familyAuth;
const sameCode = (a: readonly string[], b: readonly string[]) => a.join('') === b.join('');

/** docs/50 §4: the sixth digit signs in without a tap; a refused code empties the boxes. */
export function useWhatsAppSignIn() {
  const queryClient = useQueryClient();
  const land = useLandAfterSignIn();
  const entry = usePhoneEntry();
  const [refusals, setRefusals] = useState(0);
  const { check } = entry;
  const flow = useCodeFlow((e164) => authApi.familyCodes.request(e164));

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
  return { entry, check, flow: code, refusals, send, verify };
}

export type WhatsAppSignIn = ReturnType<typeof useWhatsAppSignIn>;
