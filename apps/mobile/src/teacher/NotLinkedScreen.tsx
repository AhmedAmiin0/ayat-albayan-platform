import { t } from '@/lib/i18n';
import { EmptyState } from '@/ui/EmptyState';
import { Screen } from '@/ui/Screen';
import { ScreenHeader } from '@/ui/ScreenHeader';
import { ScreenScroll } from '@/ui/ScreenScroll';
import { SignOutButton } from './SignOutButton';

/**
 * A teacher login the admin has not linked to a teacher file yet: say so, offer sign-out. The body
 * scrolls, so a small phone or a large text size cannot push «تسجيل الخروج» off the screen.
 */
export function NotLinkedScreen() {
  return (
    <Screen>
      <ScreenHeader title={t.teacherDash.title} />
      <ScreenScroll>
        <EmptyState title={t.teacherDash.notLinked} />
        <SignOutButton />
      </ScreenScroll>
    </Screen>
  );
}
