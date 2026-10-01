import { useForm } from '@tanstack/react-form';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Cartouche } from '@/components/ui/cartouche';
import { Field } from '@/components/ui/field';
import { FormAlert } from '@/components/ui/form-alert';
import { Input } from '@/components/ui/input';
import { t } from '@/lib/i18n';
import { BindingCover } from './BindingCover';
import { PasswordInput } from './PasswordInput';
import { signIn } from './sign-in';

const required = ({ value }: { value: string }) => (value.trim() ? undefined : t.common.required);

/**
 * Login (docs/07 login section): the form beside the leather binding; cover on top on phones.
 * `noValidate`: blank fields get the Arabic field error (docs/07 §10), never the browser bubble.
 */
export function LoginPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: { email: '', password: '' },
    onSubmit: async ({ value }) => {
      setError(null);
      const result = await signIn(value, queryClient);
      if (result.ok) await navigate({ to: result.home });
      else setError(result.error);
    },
  });

  return (
    <main className="grid min-h-screen bg-page shell:grid-cols-2">
      <div className="grid items-start justify-items-center px-4 py-8 sm:px-8 sm:py-12 shell:place-items-center">
        <form
          noValidate
          className="grid w-full max-w-[380px] gap-[22px]"
          onSubmit={(e) => {
            e.preventDefault();
            void form.handleSubmit();
          }}
        >
          <Cartouche className="justify-self-start">{t.auth.loginTitle}</Cartouche>
          <p className="text-body text-pretty text-ink-2">{t.auth.intro}</p>
          <form.Field name="email" validators={{ onSubmit: required }}>
            {(field) => (
              <Field id="email" label={t.auth.email} error={field.state.meta.errors[0]}>
                {(p) => (
                  <Input {...p} type="email" dir="ltr" autoComplete="email" required
                    value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} />
                )}
              </Field>
            )}
          </form.Field>
          <form.Field name="password" validators={{ onSubmit: required }}>
            {(field) => (
              <Field id="password" label={t.auth.password} error={field.state.meta.errors[0]}>
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
          <p className="border-t border-rule pt-4 text-xs text-pretty text-ink-3">{t.auth.guardiansNote}</p>
        </form>
      </div>
      <BindingCover />
    </main>
  );
}
