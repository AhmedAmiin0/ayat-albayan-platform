import type { ReceivableRow } from '@ab/money';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, type ListRenderItemInfo } from 'react-native';
import {
  t,
  useTheme,
  BackButton,
  EmptyState,
  ErrorState,
  Screen,
  useTabBarInset,
  ScreenHeader,
} from '@ab/mobile-kit';
import { SearchField } from '@/core/ui/form/SearchField';
import { useInsetRows } from '@/core/ui/surface/use-inset-rows';
import { useReceivables } from '@/money/shared/queries';
import { ReceivableItem } from '@/money/receivables/ReceivableItem';
import { filterReceivables } from '@/money/receivables/receivables';
import { ReceivablesSummary } from '@/money/receivables/ReceivablesSummary';

const renderRow = ({ item }: ListRenderItemInfo<ReceivableRow>) => <ReceivableItem row={item} />;

/** Sorted by the API, biggest debt first; the list is one answer so search filters locally. */
export function ReceivablesScreen() {
  const { color } = useTheme();
  const bar = useTabBarInset();
  const [search, setSearch] = useState('');
  const q = useReceivables();
  const all = q.data?.rows;
  const rows = useMemo(() => filterReceivables(all ?? [], search), [all, search]);
  const empty = search ? t.common.notFound : t.mobileMoney.receivablesEmpty;
  const cells = useInsetRows(renderRow, rows.length);
  return (
    <Screen list>
      <ScreenHeader
        title={t.mobileMoney.receivablesTitle}
        size="h2"
        connecting
        count={all?.length}
        leading={<BackButton onPress={() => router.back()} />}
      />
      <SearchField compact onSearch={setSearch} label={t.mobileMoney.receivablesSearch} />
      <FlatList
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 24 + bar }}
        data={rows}
        keyExtractor={(r) => r.id}
        {...cells}
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
