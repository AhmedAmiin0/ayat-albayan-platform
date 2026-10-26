import { router } from 'expo-router';
import { View } from 'react-native';
import { allowedRows } from '@/auth/route-permissions';
import type { Can } from '@/auth/use-permissions';
import { t } from '@/core/lib/i18n/i18n';
import { ListRow } from '@/core/ui/layout/ListRow';
import { Section } from '../Section';

const rows = () =>
  [
    { route: 'receivables', title: t.mobileMoney.receivablesTitle, href: '/more/money/receivables' },
    { route: 'subscriptions', title: t.mobileMoney.subscriptionsTitle, href: '/more/money/subscriptions' },
    { route: 'payments', title: t.mobileMoney.paymentsTitle, href: '/more/money/payments' },
  ] as const;

/** «المالية» on «المزيد»: the money lists that mirror the web's admin pages; only the rows `can` allows. */
export function MoneySection({ can = () => true }: { can?: Can }) {
  const shown = allowedRows(can, rows());
  if (shown.length === 0) return null;
  return (
    <Section title={t.mobileMoney.section}>
      <View style={{ marginHorizontal: -16 }}>
        {shown.map((r) => (
          <ListRow key={r.href} title={r.title} onPress={() => router.push(r.href)} />
        ))}
      </View>
    </Section>
  );
}
