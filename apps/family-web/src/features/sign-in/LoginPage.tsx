import { useCodesOpen } from '@ab/web-kit/auth/login/CodesGate';
import { LanguageSwitch } from '@ab/web-kit/components/shell/LanguageSwitch';
import { ListSkeleton } from '@ab/web-kit/components/ui/display/skeleton';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { SignInWays } from './SignInWays';

/**
 * The family sign-in (docs/51 §1, owner 2026-11-15): the family app's icon and name, a line of
 * welcome, then one way in for guardians and students alike. Waits for GET /auth/code/status, so
 * the right way opens at once; a later change of it opens afresh (keyed).
 */
export function LoginPage() {
  const codes = useCodesOpen('family');
  return (
    <main className="grid min-h-dvh items-start justify-items-center bg-page px-4 py-10 sm:py-16">
      <div className="grid w-full max-w-[400px] gap-6">
        <div className="flex justify-end">
          <LanguageSwitch />
        </div>
        <header className="grid justify-items-center gap-2 text-center">
          <img src="/icon-192.png" alt="" width={72} height={72} className="rounded-2xl" />
          <h1 lang="en" dir="ltr" className="font-display text-h2 font-bold">
            {t.familyApp.signIn.wordmark}
          </h1>
          <p className="text-body text-pretty text-ink-2">{t.familyApp.signIn.welcome}</p>
        </header>
        <section className="grid gap-4 rounded-lg border border-rule bg-raised p-5">
          {codes === undefined ? (
            <ListSkeleton rows={2} />
          ) : (
            <SignInWays key={String(codes)} codes={codes} />
          )}
        </section>
      </div>
    </main>
  );
}
