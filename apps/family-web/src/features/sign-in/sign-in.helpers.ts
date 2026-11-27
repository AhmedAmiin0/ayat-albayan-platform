import type { SubmitEvent } from 'react';

/** A form submit handler that keeps the page in place and starts `run`. */
export const submitWith =
  (run: () => unknown) => (e: Pick<SubmitEvent<HTMLFormElement>, 'preventDefault'>) => {
    e.preventDefault();
    void run();
  };
