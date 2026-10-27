import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { FlatList } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { inTree, useTreeBase } from '@/core/nav/tree-base';
import { EmptyState } from '@/core/ui/feedback/EmptyState';
import { ErrorState } from '@/core/ui/feedback/ErrorState';
import { ScreenHeader } from '@/core/ui/layout/ScreenHeader';
import { useTabBarInset } from '@/core/ui/layout/tab-bar-inset';
import { threadLink, useThreadMode } from '../../hooks/thread-mode';
import { callListQuery } from '../api/calls-api';
import { CallsLogRow } from './CallsLogRow';

/** «المكالمات» (docs/28 §5): every call, newest first; a tap opens that chat. Shown only while calls are on. */
export function CallsLog({ switcher }: { switcher?: ReactNode }) {
  const mode = useThreadMode();
  const base = useTreeBase();
  const inset = useTabBarInset();
  const calls = useQuery(callListQuery({ enabled: true, phone: null }));
  return (
    <>
      <ScreenHeader title={t.calls.log.title} />
      {switcher}
      <FlatList
        testID="calls-log"
        style={{ flex: 1, marginHorizontal: -16 }}
        contentContainerStyle={{ paddingBottom: 24 + inset }}
        data={calls.data ?? []}
        keyExtractor={(c) => c.id}
        renderItem={({ item }) => (
          <CallsLogRow call={item} showsPhone={mode.kind !== 'teacher'} onOpen={() => router.push(inTree(base, threadLink(item.phone_e164, mode)))} />
        )}
        refreshing={calls.isRefetching}
        onRefresh={() => void calls.refetch()}
        ListEmptyComponent={calls.isPending ? null : calls.isError ? <ErrorState onRetry={() => void calls.refetch()} /> : <EmptyState title={t.calls.log.empty} />}
      />
    </>
  );
}
