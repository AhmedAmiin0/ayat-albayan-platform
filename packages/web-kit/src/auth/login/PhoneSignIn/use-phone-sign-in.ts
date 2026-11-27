import { normalizePhone } from '@ab/core';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { codeOf } from '@ab/web-kit/auth/code/code-boxes';
import { useCodeFlow } from '@ab/web-kit/auth/code/use-code-flow';
import { signInWithCode } from '@ab/web-kit/auth/sign-in';
import { useLandAfterSignIn } from '@ab/web-kit/auth/use-return-to';
import type { Props } from './PhoneSignIn.types';
import { F } from './phone-sign-in.helpers';

/** The tab's own «not available» words in place of the family's, when it has some. */
const swapUnavailable = (error: string, unavailable: string | undefined): string =>
  error === F.errors.codes_unavailable ? (unavailable ?? error) : error;
export function usePhoneSignIn({ codes, unavailable }: Pick<Props, 'codes' | 'unavailable'>) {
  const queryClient = useQueryClient();
  const land = useLandAfterSignIn();
  const [phone, setPhone] = useState('');
  const flow = useCodeFlow((e164) => codes.request(e164));
  const send = () => {
    const parsed = normalizePhone(phone);
    if (parsed.ok) void flow.request(parsed.e164);
    else flow.setError(F.errors.invalid_phone);
  };
  const verify = () =>
    flow.guard(async () => {
      const code = codeOf(flow.digits);
      if (code === null || flow.target === null) return F.errors.code_incomplete;
      const result = await signInWithCode({ phone: flow.target, code }, queryClient, codes.verify);
      if (!result.ok) return swapUnavailable(result.error, unavailable);
      await land(result.home);
      return undefined;
    });
  return { phone, setPhone, flow, send, verify };
}
