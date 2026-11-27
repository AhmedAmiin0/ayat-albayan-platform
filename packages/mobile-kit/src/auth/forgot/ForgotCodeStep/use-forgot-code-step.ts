import { useState } from 'react';
import type { ForgotCodeStepProps } from './ForgotCodeStep.types';

export function useForgotCodeStep({ forgot }: Pick<ForgotCodeStepProps, 'forgot'>) {
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const { busy, resendIn } = forgot;
  return { code, setCode, password, setPassword, confirm, setConfirm, busy, resendIn };
}
