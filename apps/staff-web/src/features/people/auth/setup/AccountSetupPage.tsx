import { Button } from '@/components/ui/form/button';
import { Cartouche } from '@/components/ui/display/cartouche';
import { Field } from '@/components/ui/form/field';
import { FormAlert } from '@/components/ui/form/form-alert';
import { Input } from '@/components/ui/form/input';
import { t } from '@/lib/i18n/i18n';
import { PasswordInput } from '@/features/people/auth/PasswordInput';
import { LeaveSetup } from './LeaveSetup';
import { useAccountSetup } from './use-account-setup';

const S = t.teacherAuth.setup;

/**
 * /account-setup «أكمل حسابك» (docs/46 A4, A6): a teacher who came in with a WhatsApp code picks an
 * email and a password once; the portal stays closed until then. One narrow column, like /login.
 */
export function AccountSetupPage() {
  const { form, set, submit, error, busy } = useAccountSetup();
  return (
    <main className="grid min-h-screen place-items-start justify-items-center bg-page px-4 py-10 sm:place-items-center">
      <form noValidate className="grid w-full max-w-[380px] gap-5" onSubmit={submit}>
        <Cartouche>{S.title}</Cartouche>
        <p className="text-body text-pretty text-ink-2">{S.intro}</p>
        <Field id="setup-email" label={S.email} required>
          {(p) => (
            <Input
              {...p}
              type="email"
              dir="ltr"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              value={form.email}
              onChange={(e) => set('email')(e.target.value)}
            />
          )}
        </Field>
        <Field id="setup-password" label={S.password} required>
          {(p) => (
            <PasswordInput
              {...p}
              autoComplete="new-password"
              value={form.password}
              onValue={set('password')}
            />
          )}
        </Field>
        <Field id="setup-confirm" label={S.confirm} required>
          {(p) => (
            <PasswordInput
              {...p}
              autoComplete="new-password"
              value={form.confirm}
              onValue={set('confirm')}
            />
          )}
        </Field>
        {error && <FormAlert>{error}</FormAlert>}
        <Button type="submit" disabled={busy} className="min-h-11 w-full">
          {busy ? S.submitting : S.submit}
        </Button>
        <LeaveSetup />
      </form>
    </main>
  );
}
