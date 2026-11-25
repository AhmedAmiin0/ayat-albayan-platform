import type { InvoiceView } from '@ab/schedule';
import { ActivityIndicator, FlatList, type ListRenderItemInfo } from 'react-native';
import { t, useTheme, EmptyState, ErrorState } from '@ab/mobile-kit';
import { useInsetRows } from '@/core/ui/surface/use-inset-rows';
import { useStudentInvoices } from './money-queries';
import { StudentInvoiceRow } from './StudentInvoiceRow';

const keyOf = (i: InvoiceView) => i.id;
const renderInvoice = ({ item }: ListRenderItemInfo<InvoiceView>) => <StudentInvoiceRow invoice={item} />;

/**
 * GET /invoices?studentId=: the student's booking invoices (payment proofs), newest first, in one
 * inset card inside the gutter (one container rule).
 */
export function StudentInvoicesList({ studentId }: { studentId: string }) {
  const { color } = useTheme();
  const list = useStudentInvoices(studentId, true);
  const rows = useInsetRows(renderInvoice, list.data?.length ?? 0);
  return (
    <FlatList
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingBottom: 24 }}
      data={list.data ?? []}
      keyExtractor={keyOf}
      refreshing={list.isRefetching}
      onRefresh={() => void list.refetch()}
      ListEmptyComponent={
        list.data ? (
          <EmptyState title={t.mobileStudentFile.money.invoicesEmpty} />
        ) : list.isError ? (
          <ErrorState onRetry={() => void list.refetch()} message={t.mobileStudentFile.money.error} />
        ) : (
          <ActivityIndicator accessibilityLabel={t.common.loading} color={color.lapis} style={{ paddingVertical: 32 }} />
        )
      }
      {...rows}
    />
  );
}
