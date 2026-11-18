import type { ReactNode } from 'react';
import { PasswordInput } from '@ab/web-kit/auth/PasswordInput';
import { Field } from '@ab/web-kit/components/ui/form/field';
import { FormAlert } from '@ab/web-kit/components/ui/form/form-alert';
import { Input } from '@ab/web-kit/components/ui/form/input';
import { pill } from '@ab/web-kit/family/brand/pill';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { cn } from '@ab/web-kit/lib/utils';
import { useStudentSignIn } from './use-student-sign-in';

/** The student code's box as the boards draw it: 52 px, 14 px corners, bold Latin, left-set. */
const CODE_FIELD = 'min-h-[52px] rounded-[14px] px-4 font-latin text-body font-semibold ' +
  'sm:min-h-[52px] sm:text-body rtl:[&[dir=ltr]]:text-start';

/** The student code and the password, «دخول»; `children`: «أول دخول؟» / «نسيت كلمة المرور؟». */
export function StudentPasswordForm({ children }: { children?: ReactNode }) {
  const form = useStudentSignIn();
  return (
    <form
      noValidate
      className="grid gap-5"
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
            spellCheck={false} value={form.code} onChange={(e) => form.setCode(e.target.value)}
            className={CODE_FIELD} />
        )}
      </Field>
      <Field label={t.auth.password}>
        {(p) => <PasswordInput {...p} value={form.password} onValue={form.setPassword} />}
      </Field>
      {form.error && <FormAlert>{form.error}</FormAlert>}
      <button type="submit" disabled={!form.ready || form.busy}
        className={cn(pill({ tone: 'gold', size: 'lg' }), 'min-h-[52px] w-full font-extrabold')}>
        {form.busy ? t.auth.submitting : t.auth.submit}
      </button>
      {children}
    </form>
  );
}
