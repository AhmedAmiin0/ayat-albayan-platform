import { t, EmptyState, Screen, ScreenHeader, SignOutButton } from '@ab/mobile-kit';

/** A teacher login the admin has not linked to a teacher file yet: say so, offer sign-out. */
export function NotLinkedScreen() {
  return (
    <Screen>
      <ScreenHeader title={t.teacherDash.title} />
      <EmptyState title={t.teacherDash.notLinked} />
      <SignOutButton />
    </Screen>
  );
}
