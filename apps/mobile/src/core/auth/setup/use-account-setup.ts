import { accountSetupSchema } from '@ab/shared';
import { useState } from 'react';
import { authApi, authErrorText } from '@/core/auth/forgot';
import { supabase } from '@/core/lib/http/supabase';
import { t } from '@/core/lib/i18n/i18n';
import { pathKey } from '@/core/lib/query/query-keys';
import { queryClient } from '@/core/lib/query/query-client';
import { setupRefusal } from './setup-words';

interface SetupInput {
  email: string;
  password: string;
  confirm: string;
}

/** What is wrong with the form before it is sent (the API checks again), or null. */
function formProblem(input: SetupInput): string | null {
  if (!accountSetupSchema.shape.email.safeParse(input.email).success)
    return t.teacherAuth.setup.errors.invalid_email;
  return input.password === input.confirm ? null : t.familyAuth.passwordsDiffer;
}

/**
 * PUT /me/setup, then a sign-in on the new credentials (/auth/me reads the email from the JWT: else
 * the screen would loop, docs/46 §5) and /auth/me again: the tree then opens the teacher's tabs.
 */
export function useAccountSetup() {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async (input: SetupInput) => {
    const problem = formProblem(input);
    setError(problem);
    if (problem) return;
    setBusy(true);
    try {
      const body = { email: input.email.trim(), password: input.password };
      await authApi.setupAccount(body);
      // A fresh session on the new credentials: the JWT then carries the real email (docs/46 §5).
      const { error: fresh } = await supabase.auth.signInWithPassword(body);
      if (fresh) throw fresh;
      await queryClient.refetchQueries({ queryKey: pathKey('/auth/me') });
    } catch (e) {
      setError(setupRefusal(e) ?? authErrorText(e, t.common.error));
    } finally {
      setBusy(false);
    }
  };

  return { error, busy, save };
}
