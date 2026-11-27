import type { KeyboardEvent } from 'react';

/** Enter runs `onEnter` instead of submitting the form around the field. */
export const enterKey = (onEnter: () => void) => (e: KeyboardEvent<HTMLInputElement>) => {
  if (e.key !== 'Enter') return;
  e.preventDefault();
  onEnter();
};
