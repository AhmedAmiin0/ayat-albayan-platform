import type { ReactNode } from 'react';
import { PasswordInput } from '@ab/web-kit/auth/PasswordInput';
import { Button } from '@ab/web-kit/components/ui/form/button';
import { Field } from '@ab/web-kit/components/ui/form/field';
import { FormAlert } from '@ab/web-kit/components/ui/form/form-alert';
import { Input } from '@ab/web-kit/components/ui/form/input';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { useStudentSignIn } from './use-student-sign-in';

export function StudentPasswordForm({ children }: { children?: ReactNode }) {
  const form = useStudentSignIn();
  return (
    <form
      noValidate
      className="grid gap-[22px]"
      onSubmit={(e) => {
        e.preventDefault();
        void form.submit();
      }}
    >
      <Field
        label={t.familyApp.signIn.studentCode}
        hint={t.familyAuth.studentUsernameHint}
        error={form.codeProblem}
      >
        {(p) => (
          <Input {...p} dir="ltr" autoComplete="username" autoCapitalize="characters"
            spellCheck={false} value={form.code} onChange={(e) => form.setCode(e.target.value)} />
        )}
      </Field>
      <Field label={t.auth.password}>
        {(p) => <PasswordInput {...p} value={form.password} onValue={form.setPassword} />}
      </Field>
      {form.error && <FormAlert>{form.error}</FormAlert>}
      <Button type="submit" disabled={!form.ready || form.busy} className="min-h-11 w-full">
        {form.busy ? t.auth.submitting : t.auth.submit}
      </Button>
      {children}
    </form>
  );
}
