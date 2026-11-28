import type { CallView } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { type ReactNode, useCallback } from 'react';
import { FlatList, type ListRenderItemInfo, View } from 'react-native';
import {
  EmptyState,
  ErrorState,
  ScreenHeader,
  t,
  useInsetRows,
  useTabBarInset,
} from '@ab/mobile-kit';
import { inTree, useTreeBase } from '@/core/nav/tree-base';
import { threadLink, useThreadMode } from '@/inbox/thread/hooks/thread-mode';
import { callListQuery } from '@/inbox/thread/calls/api/calls-api';
import { CallsLogRow } from './CallsLogRow';

/** docs/28 §5: shown only while calls are on. */
export function CallsLog({ switcher }: { switcher?: ReactNode }) {
  const mode = useThreadMode();
  const base = useTreeBase();
  const inset = useTabBarInset();
  const calls = useQuery(callListQuery({ enabled: true, phone: null }));
  const data = calls.data ?? [];
  const row = useCallback(
    ({ item }: ListRenderItemInfo<CallView>) => (
      <CallsLogRow call={item} showsPhone={mode.kind !== 'teacher'} onOpen={() => router.push(inTree(base, threadLink(item.phone_e164, mode)))} />
    ),
    [mode, base],
  );
  const cells = useInsetRows(row, data.length);
  return (
    <View style={{ flex: 1, gap: 8 }}>
      <ScreenHeader title={t.calls.log.title} size="h2" connecting />
      {switcher}
      <FlatList
        testID="calls-log"
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 24 + inset }}
        data={data}
        keyExtractor={(c) => c.id}
        {...cells}
        refreshing={calls.isRefetching}
        onRefresh={() => void calls.refetch()}
        ListEmptyComponent={
          calls.isPending ? null : calls.isError ? (
            <ErrorState onRetry={() => void calls.refetch()} />
          ) : (
            <EmptyState title={t.calls.log.empty} />
          )
        }
      />
    </View>
  );
}
