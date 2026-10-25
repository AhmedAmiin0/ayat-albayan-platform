import { FlatList } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { LoadState } from '@/sales-money/components/LoadState';
import { useAssistants } from './api';
import { AssistantItem } from './AssistantItem';

/** «مسؤولو المبيعات» (web AssistantsList): each salesperson with their salary and commission terms. */
export function AssistantsList() {
  const list = useAssistants();
  return (
    <FlatList
      accessibilityLabel={t.assistants.tabs.list}
      style={{ flex: 1, marginHorizontal: -16 }}
      data={list.data ?? []}
      keyExtractor={(a) => a.id}
      renderItem={({ item }) => <AssistantItem assistant={item} />}
      refreshing={list.isRefetching}
      onRefresh={() => void list.refetch()}
      ListEmptyComponent={<LoadState status={list} empty emptyTitle={t.assistants.empty} />}
    />
  );
}
