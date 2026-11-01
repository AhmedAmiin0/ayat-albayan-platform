import { router } from 'expo-router';
import { allowedRows } from '@/auth/route-permissions';
import type { Can } from '@/auth/use-permissions';
import { t } from '@/core/lib/i18n/i18n';
import { Section } from '@/core/ui/surface/Section';
import { ListRow } from '@/core/ui/layout/ListRow';
import { InsetGroup } from '@/core/ui/surface/inset';

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
      <InsetGroup>
        {shown.map((r) => (
          <ListRow key={r.href} title={r.title} onPress={() => router.push(r.href)} />
        ))}
      </InsetGroup>
    </Section>
  );
}
