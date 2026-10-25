import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { useTheme } from '@/theme';
import { Button } from '@/core/ui/primitives/Button';
import { EmptyState } from '@/core/ui/feedback/EmptyState';
import { ErrorState } from '@/core/ui/feedback/ErrorState';
import { Screen } from '@/core/ui/layout/Screen';
import { ScreenHeader } from '@/core/ui/layout/ScreenHeader';
import { SearchField } from '@/core/ui/form/SearchField';
import { useReceivables } from './queries';
import { ReceivableItem } from './ReceivableItem';
import { filterReceivables } from './receivables';
import { ReceivablesSummary } from './ReceivablesSummary';

/**
 * «المستحقات» (web /admin/receivables): who still owes on a package, the biggest debt first as the
 * API sorts it. The list is one answer, so the search narrows it here. A row opens the payment form.
 */
export function ReceivablesScreen() {
  const { color } = useTheme();
  const [search, setSearch] = useState('');
  const q = useReceivables();
  const all = q.data?.rows;
  const rows = useMemo(() => filterReceivables(all ?? [], search), [all, search]);
  const empty = search ? t.common.notFound : t.mobileMoney.receivablesEmpty;
  return (
    <Screen>
      <ScreenHeader
        title={t.mobileMoney.receivablesTitle}
        subtitle={all ? t.mobileMoney.receivablesCount.replace('{n}', String(all.length)) : undefined}
        trailing={<Button variant="ghost" label={t.common.back} onPress={() => router.back()} />}
      />
      <SearchField onSearch={setSearch} label={t.mobileMoney.receivablesSearch} />
      <FlatList
        style={{ flex: 1, marginHorizontal: -16 }}
        data={rows}
        keyExtractor={(r) => r.id}
        renderItem={({ item }) => <ReceivableItem row={item} />}
        refreshing={q.isRefetching}
        onRefresh={() => void q.refetch()}
        ListHeaderComponent={q.data ? <ReceivablesSummary view={q.data} /> : null}
        ListEmptyComponent={
          q.data ? (
            <EmptyState title={empty} />
          ) : q.isError ? (
            <ErrorState onRetry={() => void q.refetch()} />
          ) : (
            <ActivityIndicator accessibilityLabel={t.common.loading} color={color.lapis} style={{ paddingVertical: 32 }} />
          )
        }
      />
    </Screen>
  );
}
