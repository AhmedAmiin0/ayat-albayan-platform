import { useForm } from '@tanstack/react-form';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/form/button';
import { Field } from '@/components/ui/form/field';
import { FormAlert } from '@/components/ui/form/form-alert';
import { Input } from '@/components/ui/form/input';
import { t } from '@/lib/i18n/i18n';
import { PasswordInput } from '@/features/people/auth/PasswordInput';
import { signIn } from '@/features/people/auth/sign-in';

const required = ({ value }: { value: string }) => (value.trim() ? undefined : t.common.required);

interface Props {
  /** The identifier control's id: `email` on the staff tab (e2e), `username` on the family tab. */
  id: 'email' | 'username';
  label: string;
  hint?: string;
  /** Links under «دخول». */
  children?: ReactNode;
}

/**
 * Identifier + password (docs/30 §5): an email signs in with GoTrue, a username or student code
 * through POST /auth/login. `noValidate`: blank fields get the Arabic field error (docs/07 §10).
 */
export function PasswordForm({ id, label, hint, children }: Props) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: { identifier: '', password: '' },
    onSubmit: async ({ value }) => {
      setError(null);
      const result = await signIn({ email: value.identifier, password: value.password }, queryClient).catch(
        () => ({ ok: false, error: t.common.error }) as const,
      );
      if (result.ok) await navigate({ to: result.home });
      else setError(result.error);
    },
  });

  return (
    <form
      noValidate
      className="grid gap-[22px]"
      onSubmit={(e) => {
        e.preventDefault();
        void form.handleSubmit();
      }}
    >
      <form.Field name="identifier" validators={{ onSubmit: required }}>
        {(field) => (
          <Field id={id} label={label} hint={hint} error={field.state.meta.errors[0]}>
            {(p) => (
              <Input {...p} type="text" dir="ltr" autoComplete="username" autoCapitalize="none" spellCheck={false}
                required value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} />
            )}
          </Field>
        )}
      </form.Field>
      <form.Field name="password" validators={{ onSubmit: required }}>
        {(field) => (
          <Field id={`${id}-password`} label={t.auth.password} error={field.state.meta.errors[0]}>
            {(p) => <PasswordInput {...p} value={field.state.value} onValue={field.handleChange} />}
          </Field>
        )}
      </form.Field>
      {error && <FormAlert>{error}</FormAlert>}
      <form.Subscribe selector={(s) => s.isSubmitting}>
        {(submitting) => (
          <Button type="submit" disabled={submitting} className="min-h-11 w-full">
            {submitting ? t.auth.submitting : t.auth.submit}
          </Button>
        )}
      </form.Subscribe>
      {children}
    </form>
  );
}
