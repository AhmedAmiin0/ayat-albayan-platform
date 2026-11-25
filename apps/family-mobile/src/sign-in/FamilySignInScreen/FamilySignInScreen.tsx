import { LanguageRow, SignInFrame, t } from '@ab/mobile-kit';
import { SignInLockup } from '@/sign-in/SignInLockup';
import { SignInWays } from '@/sign-in/SignInWays';
import { useFamilyCodes } from '@/sign-in/use-family-codes';

/** docs/50 §4-5: the root waits for code status first; other language offered by its own name. */
export function FamilySignInScreen() {
  const codes = useFamilyCodes();
  return (
    <SignInFrame title={t.familyApp.signIn.wordmark} header={<SignInLockup />}>
      {codes === undefined ? null : <SignInWays key={String(codes)} codes={codes} />}
      <LanguageRow compact />
    </SignInFrame>
  );
}
