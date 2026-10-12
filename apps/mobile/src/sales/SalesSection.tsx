import { router } from 'expo-router';
import { View } from 'react-native';
import { allowedRows } from '@/auth/route-permissions';
import type { Can } from '@/auth/use-permissions';
import { t } from '@/lib/i18n';
import { Section } from '@/more/Section';
import { ListRow } from '@/ui/ListRow';

const rows = () =>
  [
    { route: 'salesSubscriptions', title: t.sales.nav.subscriptions, href: '/more/sales/subscriptions' },
    { route: 'salesStudents', title: t.sales.nav.allStudents, href: '/more/sales/students' },
    { route: 'salesTeachers', title: t.sales.nav.teachers, href: '/more/sales/teachers' },
    { route: 'salesLive', title: t.sales.nav.live, href: '/more/sales/live' },
    { route: 'salesSchedule', title: t.sales.nav.academySchedule, href: '/more/sales/schedule' },
    { route: 'salesEarnings', title: t.assistantPortal.nav.earnings, href: '/more/sales/earnings' },
  ] as const;

/**
 * «المبيعات» on «المزيد» (docs/16, web SALES_NAV_ITEMS): the salesperson's subscriptions with their
 * history, the assistant side (all students, teachers, running lessons, the read-only schedule) and «أرباحي». Only the rows `can` allows;
 * the chats are the «المحادثات» tab. Nothing left → no section.
 */
export function SalesSection({ can = () => true }: { can?: Can }) {
  const shown = allowedRows(can, rows());
  if (shown.length === 0) return null;
  return (
    <Section title={t.sales.mobile.section}>
      <View style={{ marginHorizontal: -16 }}>
        {shown.map((r) => (
          <ListRow key={r.href} title={r.title} onPress={() => router.push(r.href)} />
        ))}
      </View>
    </Section>
  );
}
