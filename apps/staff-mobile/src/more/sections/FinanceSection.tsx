import { router } from 'expo-router';
import { allowedRows } from '@/core/auth/route-permissions';
import { t, ListRow, InsetGroup, Section } from '@ab/mobile-kit';
import type { Can } from '@ab/mobile-kit';

const rows = () =>
  [
    { route: 'summary', title: t.mobileFinance.rows.summary, href: '/more/finance/summary' },
    { route: 'payouts', title: t.mobileFinance.rows.payouts, href: '/more/finance/payouts' },
    { route: 'assistants', title: t.assistants.nav, href: '/more/finance/assistants' },
    { route: 'expenses', title: t.mobileFinance.rows.expenses, href: '/more/finance/expenses' },
    { route: 'invoices', title: t.mobileFinance.rows.invoices, href: '/more/finance/invoices' },
  ] as const;

/** Admin only. */
export function FinanceSection({ can = () => true }: { can?: Can }) {
  const shown = allowedRows(can, rows());
  if (shown.length === 0) return null;
  return (
    <Section title={t.mobileFinance.section}>
      <InsetGroup>
        {shown.map((r) => (
          <ListRow key={r.href} title={r.title} onPress={() => router.push(r.href)} />
        ))}
      </InsetGroup>
    </Section>
  );
}
