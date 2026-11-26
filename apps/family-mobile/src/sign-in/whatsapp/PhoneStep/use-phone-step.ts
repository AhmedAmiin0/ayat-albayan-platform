import type { Country } from '@ab/client-core';
import { useState } from 'react';
import type { PhoneStepProps } from './PhoneStep.types';

export function usePhoneStep({ sign }: Pick<PhoneStepProps, 'sign'>) {
  const { flow, phone } = sign;
  const [picking, setPicking] = useState(false);
  const bad = phone.check.state === 'bad';
  const pick = (country: Country) => {
    phone.setCountry(country);
    setPicking(false);
  };
  return { flow, phone, picking, setPicking, bad, pick };
}
