import { BrandLockup, t } from '@ab/web-kit';

/** The top of the family sign-in, as the family app (docs/50 §5): the kit lockup and a welcome. */
export function SignInLockup() {
  return (
    <BrandLockup>
      <p className="text-body text-pretty text-ink-2">{t.familyApp.signIn.welcome}</p>
    </BrandLockup>
  );
}
