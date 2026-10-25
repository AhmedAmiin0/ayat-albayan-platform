import { router } from 'expo-router';
import { View } from 'react-native';
import { allowedRows } from '@/auth/route-permissions';
import type { Can } from '@/auth/use-permissions';
import { t } from '@/lib/i18n';
import { ListRow } from '@/core/ui/layout/ListRow';
import { Section } from './Section';

const rows = () =>
  [
    { route: 'summary', title: t.mobileFinance.rows.summary, href: '/more/finance/summary' },
    { route: 'payouts', title: t.mobileFinance.rows.payouts, href: '/more/finance/payouts' },
    { route: 'assistants', title: t.assistants.nav, href: '/more/finance/assistants' },
    { route: 'expenses', title: t.mobileFinance.rows.expenses, href: '/more/finance/expenses' },
    { route: 'invoices', title: t.mobileFinance.rows.invoices, href: '/more/finance/invoices' },
  ] as const;

/** «الحسابات» on «المزيد» (admin): the money screens of the web «المالية» menu, one row each. */
export function FinanceSection({ can = () => true }: { can?: Can }) {
  const shown = allowedRows(can, rows());
  if (shown.length === 0) return null;
  return (
    <Section title={t.mobileFinance.section}>
      <View style={{ marginHorizontal: -16 }}>
        {shown.map((r) => (
          <ListRow key={r.href} title={r.title} onPress={() => router.push(r.href)} />
        ))}
      </View>
    </Section>
  );
}
