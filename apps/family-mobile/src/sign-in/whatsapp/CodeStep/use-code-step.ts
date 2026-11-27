import { formatPhone } from '@ab/core';
import { useState } from 'react';
import { ltr } from '@ab/mobile-kit';
import { isWholeCode } from '@ab/client-core';
import type { CodeStepProps } from './CodeStep.types';

export function useCodeStep({ sign }: CodeStepProps) {
  const { flow } = sign;
  const [code, setCode] = useState('');
  const verify = async (next: string) => {
    const refused = await sign.verify(next);
    // Only the refused code goes: digits typed meanwhile stay.
    if (refused !== null) setCode((now) => (now === next ? '' : now));
  };
  const change = (next: string) => {
    setCode(next);
    if (isWholeCode(next) && next !== code && !flow.busy) void verify(next);
  };
  const to = ltr(formatPhone(flow.target ?? ''));
  const refused = flow.error !== null && code === '';
  const whole = isWholeCode(code);
  return { flow, code, verify, change, to, refused, whole };
}
