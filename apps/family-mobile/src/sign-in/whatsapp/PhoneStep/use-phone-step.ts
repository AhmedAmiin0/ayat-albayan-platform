import { useState } from 'react';
import type { PhoneStepProps } from './PhoneStep.types';

export function usePhoneStep({ sign }: Pick<PhoneStepProps, 'sign'>) {
  const { flow, phone } = sign;
  const [picking, setPicking] = useState(false);
  const bad = phone.check.state === 'bad';
  return { flow, phone, picking, setPicking, bad };
}
