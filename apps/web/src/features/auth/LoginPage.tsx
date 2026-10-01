import { useForm } from '@tanstack/react-form';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Cartouche } from '@/components/ui/cartouche';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { NuqtaGlyph } from '@/components/ui/nuqta-glyph';
import { t } from '@/lib/i18n';
import { BindingCover } from './BindingCover';
import { signIn } from './sign-in';

/** Login (docs/07 login section): the form beside the leather binding; cover on top on phones. */
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
      <div className="grid place-items-center px-4 py-8 sm:px-8 sm:py-12">
        <form
          className="grid w-full max-w-[380px] gap-[22px]"
          onSubmit={(e) => {
            e.preventDefault();
            void form.handleSubmit();
          }}
        >
          <Cartouche className="justify-self-start">{t.auth.loginTitle}</Cartouche>
          <form.Field name="email">
            {(field) => (
              <Field id="email" label={t.auth.email}>
                {(p) => (
                  <Input {...p} type="email" dir="ltr" autoComplete="email" required
                    value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} />
                )}
              </Field>
            )}
          </form.Field>
          <form.Field name="password">
            {(field) => (
              <Field id="password" label={t.auth.password}>
                {(p) => (
                  <Input {...p} type="password" dir="ltr" autoComplete="current-password" required
                    value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} />
                )}
              </Field>
            )}
          </form.Field>
          {error && (
            <p
              role="alert"
              className="flex items-start gap-2.5 rounded-md bg-danger-soft px-3.5 py-3 text-xs text-ink shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--cinnabar)_35%,transparent)]"
            >
              <NuqtaGlyph shape="struck" className="mt-1 size-[13px] text-danger" />
              <span>{error}</span>
            </p>
          )}
          <form.Subscribe selector={(s) => s.isSubmitting}>
            {(submitting) => (
              <Button type="submit" disabled={submitting} className="min-h-11 w-full">
                {submitting ? t.auth.submitting : t.auth.submit}
              </Button>
            )}
          </form.Subscribe>
        </form>
      </div>
      <BindingCover />
    </main>
  );
}
