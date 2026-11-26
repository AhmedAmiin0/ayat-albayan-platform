import { router } from 'expo-router';
import { t, ListRow, useMyProfile } from '@ab/mobile-kit';

export type AccountHref = '/more/account' | '/teacher/more/account' | '/sales/more/account' | '/assistant/more/account';

/** R-ACC-01: every role has it, no permission needed. */
export function AccountRow({ href }: { href: AccountHref }) {
  const profile = useMyProfile();
  return (
    <ListRow
      title={t.account.nav}
      subtitle={profile.data?.full_name}
      onPress={() => router.push(href)}
    />
  );
}
