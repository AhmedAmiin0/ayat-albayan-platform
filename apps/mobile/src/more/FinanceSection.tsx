import { router } from 'expo-router';
import { View } from 'react-native';
import { t } from '@/lib/i18n';
import { ListRow } from '@/ui/ListRow';
import { Section } from './Section';

const rows = () =>
  [
    { title: t.mobileFinance.rows.summary, href: '/more/finance/summary' },
    { title: t.mobileFinance.rows.payouts, href: '/more/finance/payouts' },
    { title: t.mobileFinance.rows.expenses, href: '/more/finance/expenses' },
    { title: t.mobileFinance.rows.invoices, href: '/more/finance/invoices' },
  ] as const;

/** «الحسابات» on «المزيد» (admin): the money screens of the web «المالية» menu, one row each. */
export function FinanceSection() {
  return (
    <Section title={t.mobileFinance.section}>
      <View style={{ marginHorizontal: -16 }}>
        {rows().map((r) => (
          <ListRow key={r.href} title={r.title} onPress={() => router.push(r.href)} />
        ))}
      </View>
    </Section>
  );
}
