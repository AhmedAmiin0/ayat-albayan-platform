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
 * request); coming back to the screen or the app refetches as every query does.
 */
export function MyWalletView() {
  const earnings = useMyEarnings();
  const list = usePagedList<MyCommissionRow>({ path: '/sales/me/commissions', pageSize: 20 });
  useBellSignal('commission_earned', MINE);
  return (
    <LazyList
      testID="wallet-list"
      accessibilityLabel={W.list}
      paged={list}
      keyExtractor={keyOf}
      renderItem={renderEntry}
      ListHeaderComponent={earnings.data ? <WalletCard wallet={earnings.data.wallet ?? {}} /> : null}
      ListEmptyComponent={
        <LoadState status={{ data: list.data, isError: list.isError, refetch: list.refresh }} empty emptyTitle={W.empty} emptyHint={W.emptyHint} />
      }
    />
  );
}
