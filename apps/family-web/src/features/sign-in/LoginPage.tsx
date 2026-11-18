import { useCodesOpen } from '@ab/web-kit/auth/login/CodesGate';
import { LanguageSwitch } from '@ab/web-kit/components/shell/LanguageSwitch';
import { ListSkeleton } from '@ab/web-kit/components/ui/display/skeleton';
import { FamilyCard } from '@ab/web-kit/family/layout/FamilyCard';
import { SignInHeader } from '@ab/web-kit/family/sign-in/SignInHeader';
import { SignInPanel } from '@ab/web-kit/family/sign-in/SignInPanel';
import { SignInWays } from './SignInWays';

/**
 * The family sign-in (docs/51 §1a.1, boards PortalWebSignIn* / PortalPhoneSignIn*): the signed-out
 * header, then the emerald panel beside the cream side with the white card (gold top edge) and,
 * under it, the other language by its own name. Phones: the panel shrinks to a band the card
 * overlaps. One way in for guardians and students alike; it waits for GET /auth/code/status, so
 * the right way opens at once; a later change of it opens afresh (keyed).
 */
export function LoginPage() {
  const codes = useCodesOpen('family');
  return (
    <div className="flex min-h-dvh flex-col bg-margin">
      <SignInHeader />
      <div className="grid flex-1 lg:grid-cols-2">
        <SignInPanel />
        <main className="flex flex-col items-center gap-5 bg-[image:var(--fam-wash)] px-4 pb-8
          lg:justify-center lg:px-10 lg:py-14">
          <FamilyCard tone="gold" className="relative -mt-8 grid w-full max-w-[460px] rounded-[22px]
            p-5 shadow-fam-lift sm:p-8 lg:mt-0">
            {codes === undefined ? (
              <ListSkeleton rows={2} />
            ) : (
              <SignInWays key={String(codes)} codes={codes} />
            )}
          </FamilyCard>
          <LanguageSwitch className="min-h-11 rounded-full border border-rule-strong bg-raised
            px-[18px] font-latin text-sm font-semibold sm:min-h-11" />
        </main>
      </div>
    </div>
  );
}
