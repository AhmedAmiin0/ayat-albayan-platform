import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { meQuery } from '@ab/web-kit/auth/me';
import { PROFILE_KEY } from './api';
import { accountErrors, type AccountErrors } from './errors';

export interface AccountSaveOptions<B> {
  save: (body: B) => Promise<unknown>;
  /** The toast text after a success (t.account.toast.*). */
  toast: string;
  onDone: (message: string) => void;
  /** The email changed: /auth/me (the shell's email) is stale too. */
  refreshAuth?: boolean;
  /** Runs after a success, before the toast (e.g. clear the password fields). */
  onSaved?: () => void;
}

/** A success refreshes ['me','profile'], which the page and the shell's avatar chip read. */
export function useAccountSave<B>(o: AccountSaveOptions<B>) {
  const queryClient = useQueryClient();
  const [errors, setErrors] = useState<AccountErrors>({});
  const mutation = useMutation({
    mutationFn: o.save,
    onMutate: () => setErrors({}),
    onError: (error) => setErrors(accountErrors(error)),
    onSuccess: async () => {
      o.onSaved?.();
      o.onDone(o.toast);
      await queryClient.invalidateQueries({ queryKey: PROFILE_KEY });
      if (o.refreshAuth) await queryClient.invalidateQueries({ queryKey: meQuery.queryKey });
    },
  });
  return { errors, setErrors, pending: mutation.isPending, submit: mutation.mutate };
}
