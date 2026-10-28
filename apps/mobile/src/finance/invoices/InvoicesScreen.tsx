import type { InvoiceView } from '@ab/shared';
import { router } from 'expo-router';
import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/more/Note';
import { Button } from '@/core/ui/primitives/Button';
import { Screen } from '@/core/ui/layout/Screen';
import { ScreenHeader } from '@/core/ui/layout/ScreenHeader';
import { InvoiceRow } from './InvoiceRow';
import { useInvoices } from '../shared/queries';
import { StaleNote, StateNote } from '../shared/StateNote';
import { LazyList } from '@/core/ui/lists/LazyList';

const keyOf = (i: InvoiceView) => i.id;
const renderRow = ({ item }: { item: InvoiceView }) => <InvoiceRow invoice={item} />;

/**
 * «الفواتير» (admin; web /admin/invoices), read-only: each booking invoice with its students and
 * whether a payment was recorded from it. Recording one stays on the web for now.
 */
export function InvoicesScreen() {
  const list = useInvoices();
  return (
    <Screen>
      <ScreenHeader title={t.mobileFinance.rows.invoices} trailing={<Button variant="ghost" label={t.common.back} onPress={() => router.back()} />} />
      <StaleNote isError={list.isError} hasData={list.items.length > 0} />
      <LazyList
        paged={list}
        tabBar={false}
        keyExtractor={keyOf}
        renderItem={renderRow}
        refreshing={list.isRefetching && !list.isFetchingNextPage}
        ListEmptyComponent={<StateNote status={{ data: list.data, isError: list.isError, refetch: list.refetch }} empty emptyTitle={t.mobileFinance.invoices.empty} />}
        ListFooterComponent={list.isFetchingNextPage ? <Note>{t.common.loading}</Note> : <View style={{ height: 24 }} />}
      />
    </Screen>
  );
}
