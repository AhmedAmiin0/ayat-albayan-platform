import { t } from '@/core/lib/i18n/i18n';
import { EmptyState } from '@/core/ui/feedback/EmptyState';
import { Screen } from '@/core/ui/layout/Screen';
import { ScreenHeader } from '@/core/ui/layout/ScreenHeader';
import { SignOutButton } from '../components/SignOutButton';

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
