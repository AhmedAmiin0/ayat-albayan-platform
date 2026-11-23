import { router } from 'expo-router';
import { allowedRows } from '@/core/auth/route-permissions';
import { t, ListRow, InsetGroup, Section } from '@ab/mobile-kit';
import type { Can } from '@ab/mobile-kit';

const rows = () =>
  [
    { route: 'salesSubscriptions', title: t.sales.nav.subscriptions, href: '/more/sales/subscriptions' },
    { route: 'salesStudents', title: t.sales.nav.allStudents, href: '/more/sales/students' },
    { route: 'salesTeachers', title: t.sales.nav.teachers, href: '/more/sales/teachers' },
    { route: 'salesLive', title: t.sales.nav.live, href: '/more/sales/live' },
    { route: 'salesSchedule', title: t.sales.nav.academySchedule, href: '/more/sales/schedule' },
    { route: 'salesEarnings', title: t.assistantPortal.nav.earnings, href: '/more/sales/earnings' },
  ] as const;

/** The sales section (docs/16): only the rows `can` allows; nothing left means no section. */
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
