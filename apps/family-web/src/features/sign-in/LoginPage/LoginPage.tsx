import { cardClass, useCodesOpen, LanguageSwitch, ListSkeleton } from '@ab/web-kit';
import { LegalLinks } from '@/features/legal';
import { SignInLockup } from '@/features/sign-in/SignInLockup';
import { SignInWays } from '@/features/sign-in/SignInWays';

/**
 * The family sign-in (docs/51 §1), as the family app: the academy emblem and
 * name, a line of welcome, then one way in for guardians and students alike, and last the other
 * language by its own name and the legal pages (Google Play). Waits for GET /auth/code/status, so
 * the right way opens at once; a later change of it opens afresh (keyed).
 */
export function LoginPage() {
  const codes = useCodesOpen('family');
  return (
    <main className="grid min-h-dvh items-start justify-items-center px-4 py-10 sm:py-16">
      <div className="grid w-full max-w-[400px] gap-6">
        <SignInLockup />
        <section className={`${cardClass} grid gap-4 p-5`}>
          {codes === undefined ? (
            <ListSkeleton rows={2} />
          ) : (
            <SignInWays key={String(codes)} codes={codes} />
          )}
        </section>
        <LanguageSwitch className="justify-self-center" />
        <LegalLinks />
      </div>
    </main>
  );
}
