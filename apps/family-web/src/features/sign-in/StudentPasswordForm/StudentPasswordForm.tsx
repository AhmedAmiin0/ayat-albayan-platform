import type { ReactNode } from 'react';
import { PasswordInput, Button, Field, FormAlert, Input, t } from '@ab/web-kit';
import { useStudentSignIn } from '@/features/sign-in/use-student-sign-in';

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
