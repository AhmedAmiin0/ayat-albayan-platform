import { router } from 'expo-router';
import { View } from 'react-native';
import { allowedRows } from '@/auth/route-permissions';
import type { Can } from '@/auth/use-permissions';
import { AccountHeaderAvatar } from '@/account/components/AccountHeaderAvatar';
import { AccountRow } from '@/account/components/AccountRow';
import { t } from '@/core/lib/i18n/i18n';
import { AppearancePicker } from '@/more/appearance/AppearancePicker';
import { LanguageRow } from '@/more/appearance/LanguageRow';
import { SignOutButton } from '@/teacher/components/SignOutButton';
import { ListRow } from '@/core/ui/layout/ListRow';
import { Screen } from '@/core/ui/layout/Screen';
import { ScreenHeader } from '@/core/ui/layout/ScreenHeader';

const rows = () =>
  [
    { route: 'salesTeachers', title: t.sales.nav.teachers, href: '/sales/more/teachers' },
    { route: 'salesLive', title: t.sales.nav.live, href: '/sales/more/live' },
    { route: 'salesSubscriptions', title: t.sales.nav.subscriptions, href: '/sales/more/subscriptions' },
    { route: 'salesEarnings', title: t.assistantPortal.nav.earnings, href: '/sales/more/earnings' },
    { route: 'salesMeetings', title: t.mobileClassroom.meetingsRow, href: '/sales/more/meetings' },
  ] as const;

/**
 * The salesperson's «المزيد»: the web SalesNav pages that do not earn a tab, in its order and with
 * its gates («المعلمون», «الحلقات الجارية», «الاشتراكات» with history, «أرباحي» with «مدفوعاتي»
 * inside) and the meetings (meetings.read, owner 2026-10-12) after «حسابي», then the appearance, the language and sign-out.
 */
export function SalesMoreScreen({ can }: { can: Can }) {
  return (
    <Screen scroll>
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
