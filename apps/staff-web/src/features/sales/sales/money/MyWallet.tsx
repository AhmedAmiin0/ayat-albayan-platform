import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Button, EmptyState, FormAlert, ListSkeleton, Pager, t } from '@ab/web-kit';
import { useBellSignal } from '@/features/messaging/notifications';
import {
  MY_COMMISSIONS_PAGE_SIZE,
  MY_MONEY_KEY,
  myCommissionsQuery,
  myEarningsQuery,
} from '@/features/sales/sales/api';
import { CommissionEntry } from './CommissionEntry';
import { WalletCard } from './WalletCard';
import { listView, readView } from './wallet-view';

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

/** Balance per currency; a new-commission bell signal refreshes both without extra requests. */
export function MyWallet() {
  const [page, setPage] = useState(1);
  const earnings = useQuery(myEarningsQuery);
  const list = useQuery(myCommissionsQuery(page));
  useBellSignal('commission_earned', MY_MONEY_KEY);
  const rows = list.data?.items ?? [];
  const balance = {
    data: earnings.data && <WalletCard wallet={earnings.data.wallet} />,
    error: <Failed retry={earnings.refetch} />,
    loading: <ListSkeleton rows={1} />,
  };
  const entries = {
    rows: (
      <ul aria-labelledby="wallet-list-title">
        {rows.map((c) => (
          <CommissionEntry key={c.id} entry={c} />
        ))}
      </ul>
    ),
    data: <EmptyState title={W.empty}>{W.emptyHint}</EmptyState>,
    error: <Failed retry={list.refetch} />,
    loading: <ListSkeleton />,
  };
  return (
    <div className="grid gap-4">
      {balance[readView(earnings)]}
      <section aria-labelledby="wallet-list-title" className="grid gap-1">
        <h2 id="wallet-list-title" className="font-display text-h3 font-bold">
          {W.list}
        </h2>
        {entries[listView(rows.length, list)]}
        <Pager
          page={page}
          total={list.data?.total ?? 0}
          pageSize={MY_COMMISSIONS_PAGE_SIZE}
          onPage={setPage}
        />
      </section>
    </div>
  );
}
