import { useCodesOpen } from '@ab/web-kit/auth/login/CodesGate';
import { LanguageSwitch } from '@ab/web-kit/components/shell/LanguageSwitch';
import { ListSkeleton } from '@ab/web-kit/components/ui/display/skeleton';
import { SignInLockup } from './SignInLockup';
import { SignInWays } from './SignInWays';

/**
 * The family sign-in (docs/51 §1, owner 2026-11-15), as the family app: the academy emblem and
 * name, a line of welcome, then one way in for guardians and students alike, and last the other
 * language by its own name. Waits for GET /auth/code/status, so the right way opens at once; a
 * later change of it opens afresh (keyed).
 */
export function LoginPage() {
  const codes = useCodesOpen('family');
  return (
    <main className="grid min-h-dvh items-start justify-items-center bg-page px-4 py-10 sm:py-16">
      <div className="grid w-full max-w-[400px] gap-6">
        <SignInLockup />
        <section className="grid gap-4 rounded-lg border border-rule bg-raised p-5">
          {codes === undefined ? (
            <ListSkeleton rows={2} />
          ) : (
            <SignInWays key={String(codes)} codes={codes} />
          )}
        </section>
        <LanguageSwitch className="justify-self-center" />
      </div>
    </main>
  );
}
