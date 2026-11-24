import { router } from 'expo-router';
import { allowedRows } from '@/core/auth/route-permissions';
import {
  t,
  BiometricSwitchRow,
  SignOutButton,
  ListRow,
  Screen,
  ScreenHeader,
  InsetGroup,
  AppearancePicker,
  LanguageRow,
} from '@ab/mobile-kit';
import type { Can } from '@ab/mobile-kit';
import { AccountHeaderAvatar } from '@/account/components/AccountHeaderAvatar';
import { AccountRow } from '@/account/components/AccountRow';
import { ClockFormatPicker } from '@/more';
import { PaymentLinksRow } from '@/sales-subscribe';

const rows = () =>
  [
    { route: 'salesTeachers', title: t.sales.nav.teachers, href: '/sales/more/teachers' },
    { route: 'salesLive', title: t.sales.nav.live, href: '/sales/more/live' },
    { route: 'salesSubscriptions', title: t.sales.nav.subscriptions, href: '/sales/more/subscriptions' },
    { route: 'salesEarnings', title: t.assistantPortal.nav.earnings, href: '/sales/more/earnings' },
    { route: 'salesMeetings', title: t.mobileClassroom.meetingsRow, href: '/sales/more/meetings' },
    { route: 'templates', title: t.templates.author.nav, href: '/sales/more/templates' },
    { route: 'shortLinks', title: t.nav.shortLinks, href: '/sales/more/short-links' },
  ] as const;

/** Follows the web SalesNav order and gates; payment links in a Stripe build only. */
export function SalesMoreScreen({ can }: { can: Can }) {
  return (
    <Screen scroll>
      <ScreenHeader
        title={t.mobile.more}
        subtitle={t.mobileRoles.salesRole}
        trailing={<AccountHeaderAvatar href="/sales/more/account" />}
      />
      <InsetGroup>
        <AccountRow href="/sales/more/account" />
        {allowedRows(can, rows()).map((r) => (
          <ListRow key={r.href} title={r.title} onPress={() => router.push(r.href)} />
        ))}
        <PaymentLinksRow />
      </InsetGroup>
      <AppearancePicker />
      <ClockFormatPicker />
      <BiometricSwitchRow />
      <LanguageRow />
      <SignOutButton />
    </Screen>
  );
}
