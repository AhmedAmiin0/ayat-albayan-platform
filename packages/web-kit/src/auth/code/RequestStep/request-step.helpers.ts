import type { SubmitEvent } from 'react';

/** The form never navigates, and a blank value sends nothing. */
export const submitWhenFilled =
  (value: string, onSubmit: () => void) => (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (value.trim()) onSubmit();
  };
