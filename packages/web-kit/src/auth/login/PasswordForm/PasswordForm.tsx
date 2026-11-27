import { Button } from '@ab/web-kit/components/ui/form/Button';
import { Field } from '@ab/web-kit/components/ui/form/Field';
import { FormAlert } from '@ab/web-kit/components/ui/form/FormAlert';
import { Input } from '@ab/web-kit/components/ui/form/Input';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { PasswordInput } from '@ab/web-kit/auth/PasswordInput';
import type { Props } from './PasswordForm.types';
import { required } from './password-form.helpers';
import { usePasswordForm } from './use-password-form';

/**
 * Identifier + password (docs/30 §5): an email signs in with GoTrue, a username or student code
 * through POST /auth/login. `noValidate`: blank fields get the Arabic field error (docs/07 §10).
 */
export function PasswordForm({ id, label, hint, children }: Props) {
  const { error, form } = usePasswordForm();
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
              <Input
                {...p}
                type="text"
                dir="ltr"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                required
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
              />
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
