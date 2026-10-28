import type { InvoiceView } from '@ab/shared';
import { ActivityIndicator, FlatList, type ListRenderItemInfo } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { useTheme } from '@/theme';
import { EmptyState } from '@/core/ui/feedback/EmptyState';
import { ErrorState } from '@/core/ui/feedback/ErrorState';
import { useInsetRows } from '@/core/ui/surface/use-inset-rows';
import { useStudentInvoices } from './money-queries';
import { StudentInvoiceRow } from './StudentInvoiceRow';

const keyOf = (i: InvoiceView) => i.id;
const renderInvoice = ({ item }: ListRenderItemInfo<InvoiceView>) => <StudentInvoiceRow invoice={item} />;

/**
 * GET /invoices?studentId=: the student's booking invoices (payment proofs), newest first, in one
 * inset card inside the gutter (owner 2026-10-28: one container rule).
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
