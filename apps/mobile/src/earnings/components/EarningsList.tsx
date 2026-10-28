import type { TeacherEarningView, TeacherPaymentView } from '@ab/shared';
import { type ReactElement, useCallback } from 'react';

import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/more/Note';
import { EmptyState } from '@/core/ui/feedback/EmptyState';
import { ErrorState } from '@/core/ui/feedback/ErrorState';
import { LazyList } from '@/core/ui/lists/LazyList';
import { PaymentItem } from './PaymentItem';
import { useEarningsPayments, useEarningsSessions, type SessionFilter } from '../hooks/queries';
import type { EarningsScope } from '../lib/scope';
import { SessionItem } from './SessionItem';

type Common = { scope: EarningsScope; header: ReactElement };
type Query = { isPending: boolean; isError: boolean; isRefetching: boolean; refetch: () => unknown };

function stateOf(q: Query, empty: string): ReactElement {
  if (q.isError) return <ErrorState onRetry={() => void q.refetch()} />;
  return q.isPending ? <Note>{t.common.loading}</Note> : <EmptyState title={empty} />;
}

const keyOf = (r: { id: string }) => r.id;
const renderPayment = ({ item }: { item: TeacherPaymentView }) => <PaymentItem payment={item} />;

interface SessionsListProps extends Common {
  filter: SessionFilter;
  selected?: ReadonlyMap<string, TeacherEarningView>;
  onToggle?: (row: TeacherEarningView) => void;
}

/** The sessions, newest first, paged; with `onToggle` (admin) each payable one can be ticked. */
export function SessionsList({ scope, header, filter, selected, onToggle }: SessionsListProps) {
  const list = useEarningsSessions(scope, filter);
  // A tick changes `selected`: the visible rows get the new map, memo redraws only the one whose tick changed.
  const renderItem = useCallback(
    ({ item }: { item: TeacherEarningView }) => (
      <SessionItem row={item} checked={selected?.has(item.id) ?? false} {...(onToggle ? { onToggle } : {})} />
    ),
    [selected, onToggle],
  );
  return (
    <LazyList
      inset={false}
      tabBar={false}
      endSpace={24}
      gap={4}
      paged={list}
      keyExtractor={keyOf}
      ListHeaderComponent={header}
      renderItem={renderItem}
      ListEmptyComponent={stateOf(list, t.earnings.empty)}
    />
  );
}

/** The payments made so far, newest first, paged. */
export function PaymentsList({ scope, header }: Common) {
  const list = useEarningsPayments(scope);
  return (
    <LazyList
      inset={false}
      tabBar={false}
      endSpace={24}
      gap={4}
      paged={list}
      keyExtractor={keyOf}
      ListHeaderComponent={header}
      renderItem={renderPayment}
      ListEmptyComponent={stateOf(list, t.earnings.noPayments)}
    />
  );
}
