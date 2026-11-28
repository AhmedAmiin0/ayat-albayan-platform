import { t, LazyList } from '@ab/mobile-kit';
import { LoadState } from '@/sales-money/components/LoadState';
import { useAssistants } from '@/assistants/api/api';
import { AssistantItem } from './AssistantItem';
import type { AssistantRow } from '@ab/client-core';

const renderRow = ({ item }: { item: AssistantRow }) => (
  <AssistantItem assistant={item} />
);

export function AssistantsList() {
  const list = useAssistants();
  return (
    <LazyList
      accessibilityLabel={t.assistants.tabs.list}
      data={list.data ?? []}
      keyExtractor={(a) => a.id}
      renderItem={renderRow}
      tabBar={false}
      endSpace={24}
      refreshing={list.isRefetching}
      onRefresh={() => void list.refetch()}
      ListEmptyComponent={<LoadState status={list} empty emptyTitle={t.assistants.empty} />}
    />
  );
}
