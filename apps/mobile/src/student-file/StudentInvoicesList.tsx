import { ActivityIndicator, FlatList } from 'react-native';
import { t } from '@/lib/i18n';
import { useTheme } from '@/theme';
import { EmptyState } from '@/core/ui/feedback/EmptyState';
import { ErrorState } from '@/core/ui/feedback/ErrorState';
import { useStudentInvoices } from './money-queries';
import { StudentInvoiceRow } from './StudentInvoiceRow';

/** GET /invoices?studentId=: the student's booking invoices (payment proofs), newest first. */
export function StudentInvoicesList({ studentId }: { studentId: string }) {
  const { color } = useTheme();
  const list = useStudentInvoices(studentId, true);
  return (
    <FlatList
      style={{ flex: 1, marginHorizontal: -16 }}
      data={list.data ?? []}
      keyExtractor={(i) => i.id}
      renderItem={({ item }) => <StudentInvoiceRow invoice={item} />}
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
    />
  );
}
