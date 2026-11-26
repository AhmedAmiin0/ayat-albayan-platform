import { useState } from 'react';
import type { BoxLook } from '@/sign-in/whatsapp/CodeBox';
import { CODE_LENGTH } from '@ab/client-core';
import type { CodeBoxesProps } from './CodeBoxes.types';

export function useCodeBoxes({ value, refused }: Pick<CodeBoxesProps, 'value' | 'refused'>) {
  const [focused, setFocused] = useState(true);
  const look = (i: number): BoxLook => {
    const here = focused && i === Math.min(value.length, CODE_LENGTH - 1);
    const ring: BoxLook = here ? 'next' : 'rest';
    return refused ? 'refused' : ring;
  };
  return { setFocused, look };
}
