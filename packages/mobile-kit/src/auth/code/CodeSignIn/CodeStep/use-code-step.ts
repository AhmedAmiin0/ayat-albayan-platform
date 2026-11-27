import { useState } from 'react';
import { t } from '../../../../lib/i18n/i18n';
import type { CodeStepProps } from '../CodeSignIn.types';

export function useCodeStep({ flow, target }: CodeStepProps) {
  const [code, setCode] = useState('');
  const verifyLabel = flow.busy ? t.familyAuth.verifying : t.familyAuth.verify;
  const verify = () => void flow.verify(code);
  const resend = () => void flow.send(target);
  return { code, setCode, verifyLabel, verify, resend };
}
