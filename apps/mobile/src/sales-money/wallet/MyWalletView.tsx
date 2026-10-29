import type { MyCommissionRow } from '@ab/shared';
import { t } from '@/core/lib/i18n/i18n';
import { usePagedList } from '@/core/lib/query/use-paged-list';
import { LazyList } from '@/core/ui/lists/LazyList';
import { useBellSignal } from '@/notifications';
import { LoadState } from '../components/LoadState';
import { useMyEarnings } from '../lib/my-api';
import { CommissionEntry } from './CommissionEntry';
import { WalletCard } from './WalletCard';

const W = t.assistantPortal.wallet;
/** Both «محفظتي» queries (earnings and the commissions list): one invalidation refreshes them. */
const MINE = ['sales', 'me'] as const;

const keyOf = (c: MyCommissionRow) => c.id;
const renderEntry = ({ item }: { item: MyCommissionRow }) => <CommissionEntry entry={item} />;

/**
 * «العمولات» of «محفظتي» (owner 2026-10-29, web MyWallet): the balance per currency, then my commissions
 * newest first, 20 a page. A new «عمولة جديدة» on the bell refreshes both (useBellSignal: no extra
 * request), so does a pull; coming back to the screen or the app refetches as every query does. Once the
 * rows are in, the balance has its own spinner and retry (never rows under a blank header); before that the
 * list's one spinner or error stands for both, and its retry reloads both.
 */
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
