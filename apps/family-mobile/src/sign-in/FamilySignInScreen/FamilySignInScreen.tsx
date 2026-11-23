import { LanguageRow, SignInFrame, t } from '@ab/mobile-kit';
import { SignInLockup } from '@/sign-in/SignInLockup';
import { SignInWays } from '@/sign-in/SignInWays';
import { useFamilyCodes } from '@/sign-in/use-family-codes';

/**
 * The family app's sign-in (docs/50 §4–5): the mark and wordmark, a line of welcome, then one
 * way in for guardians and students alike. The auth gate swaps this screen for home once a
 * guardian or a student is in; a staff login is refused with the inverted «wrongApp» notice.
 * The root waits for GET /auth/code/status before the cover leaves, so the form is there at once;
 * a later change of it opens the right way afresh (keyed). Last, the other language by its own
 * name (العربية / English): a phone in one language can still sign in in the other.
 */
export function FamilySignInScreen() {
  const codes = useFamilyCodes();
  return (
    <SignInFrame title={t.familyApp.signIn.wordmark} header={<SignInLockup />}>
      {codes === undefined ? null : <SignInWays key={String(codes)} codes={codes} />}
      <LanguageRow compact />
    </SignInFrame>
  );
}
