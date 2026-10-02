import { t } from '@/lib/i18n';
import { EmptyState } from '@/ui/EmptyState';
import { Screen } from '@/ui/Screen';
import { ScreenHeader } from '@/ui/ScreenHeader';
import { SignOutButton } from './SignOutButton';

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
