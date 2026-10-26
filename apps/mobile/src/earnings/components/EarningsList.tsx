import type { TeacherEarningView, TeacherPaymentView } from '@ab/shared';
import type { ReactElement } from 'react';
import { FlatList } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/more/Note';
import { EmptyState } from '@/core/ui/feedback/EmptyState';
import { ErrorState } from '@/core/ui/feedback/ErrorState';
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

interface SessionsListProps extends Common {
  filter: SessionFilter;
  selected?: ReadonlyMap<string, TeacherEarningView>;
  onToggle?: (row: TeacherEarningView) => void;
}

/** The sessions, newest first, paged; with `onToggle` (admin) each payable one can be ticked. */
export function SessionsList({ scope, header, filter, selected, onToggle }: SessionsListProps) {
  const list = useEarningsSessions(scope, filter);
  return (
    <FlatList
      style={{ flex: 1 }}
      contentContainerStyle={{ gap: 4, paddingBottom: 24 }}
      data={list.items}
      keyExtractor={(r) => r.id}
      ListHeaderComponent={header}
      renderItem={({ item }) => (
        <SessionItem row={item} checked={selected?.has(item.id) ?? false} {...(onToggle ? { onToggle: () => onToggle(item) } : {})} />
      )}
      onEndReached={list.loadMore}
      refreshing={list.isRefetching}
      onRefresh={list.refresh}
      ListEmptyComponent={stateOf(list, t.earnings.empty)}
    />
  );
}

/** The payments made so far, newest first, paged. */
export function PaymentsList({ scope, header }: Common) {
  const list = useEarningsPayments(scope);
  return (
    <FlatList<TeacherPaymentView>
      style={{ flex: 1 }}
      contentContainerStyle={{ gap: 4, paddingBottom: 24 }}
      data={list.items}
      keyExtractor={(p) => p.id}
      ListHeaderComponent={header}
      renderItem={({ item }) => <PaymentItem payment={item} />}
      onEndReached={list.loadMore}
      refreshing={list.isRefetching}
      onRefresh={list.refresh}
      ListEmptyComponent={stateOf(list, t.earnings.noPayments)}
    />
  );
}
