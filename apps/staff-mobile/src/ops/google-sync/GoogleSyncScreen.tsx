import { useHolds, useIsAdmin, t, Screen } from '@ab/mobile-kit';
import { GoogleSyncCard } from './GoogleSyncCard';
import { SubScreenHeader } from '@/ops/shared/SubScreenHeader';

/** docs/26b §4: needs settings.read and base-role admin as the API checks; waits for /auth/me. */
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
