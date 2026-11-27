import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { verifyCode } from '@ab/web-kit/report/public-api';
import type { CodeEntryProps } from './CodeEntry.types';

export function useCodeEntry({ onVerified }: Pick<CodeEntryProps, 'onVerified'>) {
  const g = t.reportPage.gate;
  const [code, setCode] = useState('');
  const verify = useMutation({ mutationFn: verifyCode, onSuccess: onVerified });
  return { g, code, setCode, verify };
}
