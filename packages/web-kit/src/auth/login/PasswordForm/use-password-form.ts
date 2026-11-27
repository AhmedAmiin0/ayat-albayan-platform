import { useForm } from '@tanstack/react-form';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { signIn } from '@ab/web-kit/auth/sign-in';
import { useLandAfterSignIn } from '@ab/web-kit/auth/use-return-to';

export function usePasswordForm() {
  const queryClient = useQueryClient();
  const land = useLandAfterSignIn();
  const [error, setError] = useState<string | null>(null);
  const form = useForm({
    defaultValues: { identifier: '', password: '' },
    onSubmit: async ({ value }) => {
      setError(null);
      const result = await signIn(
        { email: value.identifier, password: value.password },
        queryClient,
      ).catch(() => ({ ok: false, error: t.common.error }) as const);
      if (result.ok) await land(result.home);
      else setError(result.error);
    },
  });
  return { error, form };
}
