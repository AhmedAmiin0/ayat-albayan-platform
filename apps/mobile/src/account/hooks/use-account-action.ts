import type { AccountProfile } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { type AccountField, type AccountFieldErrors, accountErrors } from '../lib/account-errors';
import { PROFILE_KEY } from './queries';

export interface AccountActionOptions<V> {
  /** The /me call; a returned profile replaces ['me','profile'] (header, row and form update at once). */
  run: (vars: V) => Promise<AccountProfile | undefined>;
  /** account.toast.* shown once it lands. */
  success: string;
  /** Where a network or unknown failure shows (default: under the button). */
  fallback?: AccountField;
  /** Clears the section's inputs (the passwords) after a success. */
  onDone?: () => void;
}

/** One section's save: pending flag, field-level errors, the success notice (R-ACC-01..05). */
export function useAccountAction<V>({ run, success, fallback, onDone }: AccountActionOptions<V>) {
  const client = useQueryClient();
  const [errors, setErrors] = useState<AccountFieldErrors>({});
  const [notice, setNotice] = useState<string>();
  const mutation = useMutation({
    mutationFn: run,
    onMutate: () => {
      setErrors({});
      setNotice(undefined);
    },
    onSuccess: (profile) => {
      if (profile) client.setQueryData(PROFILE_KEY, profile);
      setNotice(success);
      onDone?.();
    },
    onError: (error) => setErrors(accountErrors(error, fallback)),
  });
  /** Client-side checks failed: show them, send nothing. */
  const reject = (found: AccountFieldErrors) => {
    setNotice(undefined);
    setErrors(found);
  };
  return { submit: mutation.mutate, pending: mutation.isPending, errors, notice, reject };
}
