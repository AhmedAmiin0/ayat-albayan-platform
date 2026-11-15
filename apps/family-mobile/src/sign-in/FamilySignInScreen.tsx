import { SignInFrame, t } from '@ab/mobile-kit';
import { SignInLockup } from './SignInLockup';
import { SignInWays } from './SignInWays';
import { useFamilyCodes } from './use-family-codes';

/**
 * The family app's sign-in (docs/50 §4–5): the mark and wordmark, a line of welcome, then one
 * way in for guardians and students alike. The auth gate swaps this screen for home once a
 * guardian or a student is in; a staff login is refused with the inverted «wrongApp» notice.
 * The root waits for GET /auth/code/status before the cover leaves, so the form is there at once;
 * a later change of it opens the right way afresh (keyed).
 */
export function FamilySignInScreen() {
  const codes = useFamilyCodes();
  return (
    <SignInFrame title={t.familyApp.signIn.wordmark} header={<SignInLockup />}>
      {codes === undefined ? null : <SignInWays key={String(codes)} codes={codes} />}
    </SignInFrame>
  );
}
