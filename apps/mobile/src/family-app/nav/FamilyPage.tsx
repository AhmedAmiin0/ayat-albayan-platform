import type { ReactNode } from 'react';
import { RefreshControl, ScrollView } from 'react-native';
import { usePullRefresh } from '@/core/lib/query/pull-refresh';
import { Screen } from '@/core/ui/layout/Screen';

interface FamilyPageProps {
  /** The screen's FamilyHeader. */
  header: ReactNode;
  /** Pull to refresh: the screen's own read again (the spinner is the viewer's pull only). */
  onRefresh: () => unknown;
  children: ReactNode;
}

/** A family screen: its header over a scrolling body with pull to refresh (docs/50 §6). */
export function FamilyPage({ header, onRefresh, children }: FamilyPageProps) {
  const pull = usePullRefresh(onRefresh);
  return (
    <Screen>
      {header}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ gap: 12, paddingBottom: 24 }}
        refreshControl={<RefreshControl {...pull} />}
      >
        {children}
      </ScrollView>
    </Screen>
  );
}
