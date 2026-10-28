import { FlatList, type ListRenderItemInfo } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { useInsetRows } from '@/core/ui/surface/use-inset-rows';
import { LoadState } from '@/sales-money/components/LoadState';
import { type AssistantRow, useAssistants } from '../api/api';
import { AssistantItem } from './AssistantItem';

const renderRow = ({ item }: ListRenderItemInfo<AssistantRow>) => <AssistantItem assistant={item} />;

/**
 * «مسؤولو المبيعات» (web AssistantsList): each salesperson with their salary and commission terms, in
 * one inset card inside the gutter (owner 2026-10-28: one container rule).
 */
export function AssistantsList() {
  const list = useAssistants();
  const cells = useInsetRows(renderRow, list.data?.length ?? 0);
  return (
    <FlatList
      accessibilityLabel={t.assistants.tabs.list}
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingBottom: 24 }}
      data={list.data ?? []}
      keyExtractor={(a) => a.id}
      {...cells}
      refreshing={list.isRefetching}
      onRefresh={() => void list.refetch()}
      ListEmptyComponent={<LoadState status={list} empty emptyTitle={t.assistants.empty} />}
    />
  );
}
