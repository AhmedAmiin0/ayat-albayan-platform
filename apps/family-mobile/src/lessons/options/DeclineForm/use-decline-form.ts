import { useState } from 'react';
import { t } from '@ab/mobile-kit';

export function useDeclineForm() {
  const [reason, setReason] = useState('');
  const A = t.portal.actions;
  return { reason, setReason, A };
}
