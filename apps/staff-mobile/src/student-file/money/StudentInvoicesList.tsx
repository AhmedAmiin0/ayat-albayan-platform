import type { InvoiceView } from '@ab/schedule';
import { ActivityIndicator } from 'react-native';
import { EmptyState, ErrorState, LazyList, t, useTheme } from '@ab/mobile-kit';
import { useStudentInvoices } from './money-queries';
import { StudentInvoiceRow } from './StudentInvoiceRow';

const keyOf = (i: InvoiceView) => i.id;
const renderInvoice = ({ item }: { item: InvoiceView }) => (
  <StudentInvoiceRow invoice={item} />
);

/**
 * GET /invoices?studentId=: the student's booking invoices (payment proofs), newest first, in one
 * inset card inside the gutter (one container rule).
 */
export function StudentInvoicesList({ studentId }: { studentId: string }) {
  const { color } = useTheme();
  const list = useStudentInvoices(studentId, true);
  return (
    <LazyList
      data={list.data ?? []}
      keyExtractor={keyOf}
      renderItem={renderInvoice}
      tabBar={false}
      endSpace={24}
      refreshing={list.isRefetching}
      onRefresh={() => void list.refetch()}
      ListEmptyComponent={
        list.data ? (
          <EmptyState title={t.mobileStudentFile.money.invoicesEmpty} />
        ) : list.isError ? (
          <ErrorState
            onRetry={() => void list.refetch()}
            message={t.mobileStudentFile.money.error}
          />
        ) : (
          <ActivityIndicator
            accessibilityLabel={t.common.loading}
            color={color.lapis}
            style={{ paddingVertical: 32 }}
          />
        )
      }
    />
  );
}
