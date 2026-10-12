import { router } from 'expo-router';
import { t } from '@/lib/i18n';
import { ListRow } from '@/ui/ListRow';
import { useMyProfile } from './queries';

export type AccountHref = '/more/account' | '/teacher/more/account' | '/sales/more/account' | '/assistant/more/account';

/** «حسابي» in «المزيد» (R-ACC-01): every role has it, no permission needed; the name under it. */
export function AccountRow({ href }: { href: AccountHref }) {
  const profile = useMyProfile();
  return <ListRow title={t.account.nav} subtitle={profile.data?.full_name} onPress={() => router.push(href)} />;
}
