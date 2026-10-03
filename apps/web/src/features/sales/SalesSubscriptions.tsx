import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Cartouche } from '@/components/ui/cartouche';
import { EmptyState } from '@/components/ui/empty-state';
import { FormAlert } from '@/components/ui/form-alert';
import { PageHead } from '@/components/ui/page';
import { Tabs } from '@/components/ui/tabs';
import { t } from '@/lib/i18n';
import { salesSubscriptionsQuery, type SubscriptionKind } from './api';
import { SubscriptionRow } from './SubscriptionRow';

const KINDS = (): { value: SubscriptionKind; label: string }[] => [
  { value: 'pending', label: t.sales.subscriptions.pending },
  { value: 'confirmed', label: t.sales.subscriptions.confirmed },
];

/**
 * /sales/subscriptions «الاشتراكات»: my subscriptions in two separate lists, «في الانتظار» and
 * «مؤكدة», never mixed. Only the selected kind is fetched. No price, no payment.
 */
export function SalesSubscriptions() {
  const [kind, setKind] = useState<SubscriptionKind>('pending');
  const list = useQuery(salesSubscriptionsQuery(kind));
  return (
    <>
      <PageHead>
        <Cartouche>{t.sales.nav.subscriptions}</Cartouche>
      </PageHead>
      <Tabs label={t.sales.subscriptions.kinds} tabs={KINDS()} value={kind} onChange={setKind} />
      <div role="tabpanel" aria-label={t.sales.subscriptions[kind]}>
        {list.isPending && <p className="py-6 text-center text-ink-3">{t.common.loading}</p>}
        {list.isError && (
          <FormAlert>
            {t.sales.loadFailed}{' '}
            <Button type="button" variant="secondary" size="sm" onClick={() => void list.refetch()}>
              {t.sales.retry}
            </Button>
          </FormAlert>
        )}
        {list.data?.length === 0 && (
          <EmptyState title={kind === 'pending' ? t.sales.subscriptions.emptyPending : t.sales.subscriptions.emptyConfirmed} />
        )}
        {list.data && list.data.length > 0 && (
          <ul aria-label={t.sales.subscriptions.list}>
            {list.data.map((s) => (
              <SubscriptionRow key={s.id} subscription={s} />
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
