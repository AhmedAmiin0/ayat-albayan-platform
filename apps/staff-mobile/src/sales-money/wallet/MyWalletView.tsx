import type { MyCommissionRow } from '@ab/shared';
import { t } from '@ab/mobile-kit';
import { usePagedList } from '@/core/lib/query/use-paged-list';
import { LazyList } from '@/core/ui/lists/LazyList';
import { useBellSignal } from '@/notifications';
import { LoadState } from '@/sales-money/components/LoadState';
import { useMyEarnings } from '@/sales-money/lib/my-api';
import { CommissionEntry } from './CommissionEntry';
import { WalletCard } from './WalletCard';

const W = t.assistantPortal.wallet;
/** One shared prefix so one invalidation refreshes both queries. */
const MINE = ['sales', 'me'] as const;

const keyOf = (c: MyCommissionRow) => c.id;
const renderEntry = ({ item }: { item: MyCommissionRow }) => <CommissionEntry entry={item} />;

/** The bell's new commission refreshes both with no extra request (useBellSignal). */
export function MyWalletView() {
  const earnings = useMyEarnings();
  const list = usePagedList<MyCommissionRow>({ path: '/sales/me/commissions', pageSize: 20 });
  useBellSignal('commission_earned', MINE);
  // After `paged`: the pull runs the list's refresh (its spinner) and the balance's refetch together.
  const pull = () => {
    list.refresh();
    void earnings.refetch();
  };
  return (
    <LazyList
      testID="wallet-list"
      accessibilityLabel={W.list}
      paged={list}
      onRefresh={pull}
      keyExtractor={keyOf}
      renderItem={renderEntry}
      ListHeaderComponent={
        earnings.data ? (
          <WalletCard wallet={earnings.data.wallet ?? {}} />
        ) : list.data ? (
          <LoadState status={earnings} empty={false} emptyTitle="" />
        ) : null
      }
      ListEmptyComponent={
        <LoadState status={{ data: list.data, isError: list.isError, refetch: pull }} empty emptyTitle={W.empty} emptyHint={W.emptyHint} />
      }
    />
  );
}
