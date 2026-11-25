import type { SubmitEvent } from 'react';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@ab/web-kit/lib/http/supabase';
import { authApi } from '@ab/web-kit/auth/login/auth-api';
import { meQuery } from '@ab/web-kit/auth/me';
import { useLandAfterSignIn } from '@ab/web-kit/auth/use-return-to';
import { setupErrorText, setupFormProblem, type SetupForm } from './setup-errors';

/**
 * PUT /me/setup, then a fresh session: /auth/me reads the email from the JWT, so the old token
 * would still say the synthetic email and the portal guard would loop (docs/46 §5).
 * The cached /auth/me takes the new email, so /teacher's guard lets her in.
 */
function useSaveSetup() {
  const queryClient = useQueryClient();
  const land = useLandAfterSignIn();
  return useMutation({
    mutationFn: async (body: { email: string; password: string }) => {
      await authApi.setupAccount(body);
      // A fresh session on the new credentials (the old refresh token may not outlive the change).
      const { error } = await supabase.auth.signInWithPassword(body);
      if (error) throw error;
      // The new email at once: /teacher's guard must not wait for the refreshed JWT on /auth/me.
      queryClient.setQueryData(meQuery.queryKey, (me) => (me ? { ...me, email: body.email } : me));
    },
    // Her home, or the page she opened (a report link) before signing in.
    onSuccess: () => land('/teacher'),
  });
}

export function useAccountSetup() {
  const save = useSaveSetup();
  const [form, setForm] = useState<SetupForm>({ email: '', password: '', confirm: '' });
  const [problem, setProblem] = useState<string | undefined>();
  const set = (key: keyof SetupForm) => (value: string) => setForm((f) => ({ ...f, [key]: value }));
  const submit = (e: SubmitEvent) => {
    e.preventDefault();
    const found = setupFormProblem(form);
    setProblem(found);
    if (!found) save.mutate({ email: form.email.trim(), password: form.password });
  };
  const error = problem ?? (save.error ? setupErrorText(save.error) : undefined);
  return { form, set, submit, error, busy: save.isPending };
}
