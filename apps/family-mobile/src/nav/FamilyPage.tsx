import type { ReactNode } from 'react';
import { RefreshControl, ScrollView } from 'react-native';
import { Notice, usePullRefresh, Screen } from '@ab/mobile-kit';
import { useChildSwitch } from './switch-store';

interface FamilyPageProps {
  /** The screen's FamilyHeader. */
  header: ReactNode;
  /** Pull to refresh: the screen's own read again (the spinner is the viewer's pull only). */
  onRefresh: () => unknown;
  children: ReactNode;
}

/**
 * A family screen: its header over a scrolling body with pull to refresh (docs/50 §6); first in
 * the body, the note after a child switch while it shows (canvas SwitchDone).
 */
export function FamilyPage({ header, onRefresh, children }: FamilyPageProps) {
  const pull = usePullRefresh(onRefresh);
  const { notice } = useChildSwitch();
  return (
    <Screen>
      {header}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ gap: 12, paddingBottom: 24 }}
        refreshControl={<RefreshControl {...pull} />}
      >
        {notice ? <Notice message={notice} /> : null}
        {children}
      </ScrollView>
    </Screen>
  );
}
