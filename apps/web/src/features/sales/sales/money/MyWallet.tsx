import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/form/button';
import { EmptyState } from '@/components/ui/display/empty-state';
import { FormAlert } from '@/components/ui/form/form-alert';
import { ListSkeleton } from '@/components/ui/display/skeleton';
import { Pager } from '@/components/ui/layout/pager';
import { useBellSignal } from '@/features/messaging/notifications';
import { t } from '@/lib/i18n/i18n';
import { MY_COMMISSIONS_PAGE_SIZE, MY_MONEY_KEY, myCommissionsQuery, myEarningsQuery } from '../api';
import { CommissionEntry } from './CommissionEntry';
import { WalletCard } from './WalletCard';

const W = t.assistantPortal.wallet;

/** A read that failed: the sales pages' words and a retry. */
function Failed({ retry }: { retry: () => unknown }) {
  return (
    <FormAlert>
      {t.sales.loadFailed}{' '}
      <Button type="button" variant="secondary" size="sm" onClick={() => void retry()}>
        {t.sales.retry}
      </Button>
    </FormAlert>
  );
}

/**
 * «العمولات» of «محفظتي» on /sales/earnings (owner 2026-10-29): the balance per currency, then my
 * commissions newest first, 20 a page. A new «عمولة جديدة» on the bell refreshes both (useBellSignal, no
 * extra request); the window's focus refetches as every query does. Read-only: the admin pays. The balance
 * has its own skeleton and retry: the entries never show under a blank header.
 */
export function MyWallet() {
  const [page, setPage] = useState(1);
  const earnings = useQuery(myEarningsQuery);
  const list = useQuery(myCommissionsQuery(page));
  useBellSignal('commission_earned', MY_MONEY_KEY);
  const rows = list.data?.items ?? [];
  return (
    <div className="grid gap-4">
      {earnings.data ? (
        <WalletCard wallet={earnings.data.wallet ?? {}} />
      ) : earnings.isError ? (
        <Failed retry={earnings.refetch} />
      ) : (
        <ListSkeleton rows={1} />
      )}
      <section aria-labelledby="wallet-list-title" className="grid gap-1">
        <h2 id="wallet-list-title" className="font-display text-h3 font-bold">
          {W.list}
        </h2>
        {rows.length > 0 ? (
          <ul aria-labelledby="wallet-list-title">
            {rows.map((c) => (
              <CommissionEntry key={c.id} entry={c} />
            ))}
          </ul>
        ) : list.data ? (
          <EmptyState title={W.empty}>{W.emptyHint}</EmptyState>
        ) : list.isError ? (
          <Failed retry={list.refetch} />
        ) : (
          <ListSkeleton />
        )}
        <Pager page={page} total={list.data?.total ?? 0} pageSize={MY_COMMISSIONS_PAGE_SIZE} onPage={setPage} />
      </section>
    </div>
  );
}
