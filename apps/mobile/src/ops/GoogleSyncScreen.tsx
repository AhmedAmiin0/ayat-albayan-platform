import { useHolds, useIsAdmin } from '@/auth/use-permissions';
import { t } from '@/core/lib/i18n/i18n';
import { Screen } from '@/core/ui/layout/Screen';
import { GoogleSyncCard } from './GoogleSyncCard';
import { SubScreenHeader } from './SubScreenHeader';

/**
 * «مزامنة Google» (docs/26b §4): the read-only card, unchanged. Admins only (settings.read AND the
 * base-role admin, as the API checks): no request before /auth/me answers.
 */
export function GoogleSyncScreen() {
  const holds = useHolds('settings.read');
  const admin = useIsAdmin();
  return (
    <Screen scroll>
      <SubScreenHeader title={t.googleSync.mobile.title} />
      {holds && admin ? <GoogleSyncCard /> : null}
    </Screen>
  );
}
