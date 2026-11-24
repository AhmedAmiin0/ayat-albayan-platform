import { router } from 'expo-router';
import { allowedRows } from '@/core/auth/route-permissions';
import { t, ListRow, InsetGroup, Section } from '@ab/mobile-kit';
import type { Can } from '@ab/mobile-kit';

const rows = () =>
  [
    { route: 'receivables', title: t.mobileMoney.receivablesTitle, href: '/more/money/receivables' },
    { route: 'subscriptions', title: t.mobileMoney.subscriptionsTitle, href: '/more/money/subscriptions' },
    { route: 'payments', title: t.mobileMoney.paymentsTitle, href: '/more/money/payments' },
  ] as const;

/** Only the rows `can` allows. */
export function MoneySection({ can = () => true }: { can?: Can }) {
  const shown = allowedRows(can, rows());
  if (shown.length === 0) return null;
  return (
    <Section title={t.mobileMoney.section}>
      <InsetGroup>
        {shown.map((r) => (
          <ListRow key={r.href} title={r.title} onPress={() => router.push(r.href)} />
        ))}
      </InsetGroup>
    </Section>
  );
}
