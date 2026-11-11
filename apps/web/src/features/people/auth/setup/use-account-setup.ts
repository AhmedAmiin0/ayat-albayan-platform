import type { SubmitEvent } from 'react';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { supabase } from '@/lib/http/supabase';
import { authApi } from '@/features/people/auth/login/auth-api';
import { meQuery } from '@/features/people/auth/me';
import { setupErrorText, setupFormProblem, type SetupForm } from './setup-errors';

/**
 * PUT /me/setup, then a fresh session: /auth/me reads the email from the JWT, so without
 * refreshSession() the portal guard would still see the synthetic email and loop (docs/46 §5).
 * /auth/me is dropped, so /teacher's guard reads it again.
 */
function useSaveSetup() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return useMutation({
    mutationFn: async (body: { email: string; password: string }) => {
      await authApi.setupAccount(body);
      const { error } = await supabase.auth.refreshSession();
      if (error) throw error;
      queryClient.removeQueries({ queryKey: meQuery.queryKey });
    },
    onSuccess: () => navigate({ to: '/teacher' }),
  });
}

/** The «أكمل حسابك» form: its fields, the first problem to show, and the submit. */
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
