import { router } from 'expo-router';
import { View } from 'react-native';
import { allowedRows } from '@/auth/route-permissions';
import type { Can } from '@/auth/use-permissions';
import { AccountHeaderAvatar } from '@/account/AccountHeaderAvatar';
import { AccountRow } from '@/account/AccountRow';
import { t } from '@/lib/i18n';
import { AppearancePicker } from '@/more/AppearancePicker';
import { LanguageRow } from '@/more/LanguageRow';
import { SignOutButton } from '@/teacher/SignOutButton';
import { ListRow } from '@/ui/ListRow';
import { Screen } from '@/ui/Screen';
import { ScreenHeader } from '@/ui/ScreenHeader';

const rows = () =>
  [
    { route: 'salesTeachers', title: t.sales.nav.teachers, href: '/sales/more/teachers' },
    { route: 'salesLive', title: t.sales.nav.live, href: '/sales/more/live' },
    { route: 'salesSubscriptions', title: t.sales.nav.subscriptions, href: '/sales/more/subscriptions' },
    { route: 'salesEarnings', title: t.assistantPortal.nav.earnings, href: '/sales/more/earnings' },
  ] as const;

/**
 * The salesperson's «المزيد»: the web SalesNav pages that do not earn a tab, in its order and with
 * its gates («المعلمون», «الحلقات الجارية», «الاشتراكات» with history, «أرباحي» with «مدفوعاتي»
 * inside) after «حسابي», then the appearance, the language and sign-out. No internal meetings (docs/16 row 12b).
 */
export function SalesMoreScreen({ can }: { can: Can }) {
  return (
    <Screen>
      <ScreenHeader
        title={t.mobile.more}
        subtitle={t.mobileRoles.salesRole}
        trailing={<AccountHeaderAvatar href="/sales/more/account" />}
      />
      <View style={{ marginHorizontal: -16 }}>
        <AccountRow href="/sales/more/account" />
        {allowedRows(can, rows()).map((r) => (
          <ListRow key={r.href} title={r.title} onPress={() => router.push(r.href)} />
        ))}
      </View>
      <AppearancePicker />
      <LanguageRow />
      <SignOutButton />
    </Screen>
  );
}
