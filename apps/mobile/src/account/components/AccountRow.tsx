import { router } from 'expo-router';
import { t } from '@/core/lib/i18n/i18n';
import { ListRow } from '@/core/ui/layout/ListRow';
import { useMyProfile } from '../hooks/queries';

export type AccountHref = '/more/account' | '/teacher/more/account' | '/sales/more/account' | '/assistant/more/account';

/** «حسابي» in «المزيد» (R-ACC-01): every role has it, no permission needed; the name under it. */
export function AccountRow({ href }: { href: AccountHref }) {
  const profile = useMyProfile();
  return <ListRow title={t.account.nav} subtitle={profile.data?.full_name} onPress={() => router.push(href)} />;
}
