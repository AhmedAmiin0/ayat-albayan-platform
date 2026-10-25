import { router } from 'expo-router';
import { FlatList, View } from 'react-native';
import { t } from '@/lib/i18n';
import { Note } from '@/more/Note';
import { Button } from '@/core/ui/primitives/Button';
import { ListRow } from '@/core/ui/layout/ListRow';
import { Screen } from '@/core/ui/layout/Screen';
import { ScreenHeader } from '@/core/ui/layout/ScreenHeader';
import { StatusChip } from '@/core/ui/feedback/StatusChip';
import { invoiceStudents, invoiceSubtitle } from './invoice-text';
import { useInvoices } from './queries';
import { StaleNote, StateNote } from './StateNote';

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
      <FlatList
        style={{ flex: 1, marginHorizontal: -16 }}
        data={list.items}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => (
          <ListRow
            title={invoiceStudents(item)}
            subtitle={invoiceSubtitle(item)}
            trailing={
              item.payment_id ? (
                <StatusChip tone="ok" glyph="fill" label={t.finance.invoicePaid} size="sm" />
              ) : (
                <StatusChip tone="neutral" glyph="hollow" label={t.mobileFinance.invoices.notRecorded} size="sm" />
              )
            }
          />
        )}
        onEndReached={list.loadMore}
        onEndReachedThreshold={0.4}
        refreshing={list.isRefetching && !list.isFetchingNextPage}
        onRefresh={list.refresh}
        ListEmptyComponent={<StateNote status={{ data: list.data, isError: list.isError, refetch: list.refetch }} empty emptyTitle={t.mobileFinance.invoices.empty} />}
        ListFooterComponent={list.isFetchingNextPage ? <Note>{t.common.loading}</Note> : <View style={{ height: 24 }} />}
      />
    </Screen>
  );
}
