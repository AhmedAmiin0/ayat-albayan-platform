import { useState } from 'react';
import { useTheme } from '@ab/mobile-kit';
import type { PhoneFieldProps } from './PhoneField.types';

export function usePhoneField({ state }: Pick<PhoneFieldProps, 'state'>) {
  const { color } = useTheme();
  const [focused, setFocused] = useState(false);
  const ring = focused ? color.lapis : color.ruleInput;
  const edge = state === 'bad' ? color.bad : ring;
  return { focused, setFocused, edge };
}
