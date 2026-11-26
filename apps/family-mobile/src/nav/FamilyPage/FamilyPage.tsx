import type { ReactNode } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { Notice, usePullRefresh, Screen, useTabBarInset } from '@ab/mobile-kit';
import { useChildSwitch } from '@/nav/switch-store';

interface FamilyPageProps {
  /** The screen's FamilyHeader. */
  header: ReactNode;
  /** Pull to refresh: the screen's own read again (the spinner is the viewer's pull only). */
  onRefresh: () => unknown;
  children: ReactNode;
}

/** The note after a child switch, floating over the page just above the tab bar (SwitchDone). */
function SwitchNotice() {
  const { notice } = useChildSwitch();
  const bottom = useTabBarInset() + 12;
  if (!notice) return null;
  return (
    <View
      testID="switch-notice"
      pointerEvents="none"
      style={{ position: 'absolute', start: 16, end: 16, bottom }}
    >
      <Notice message={notice} />
    </View>
  );
}

/**
 * A family screen: its header over a scrolling body with pull to refresh (docs/50 §6), and the
 * note after a child switch floating at the bottom while it shows (no shift of the page).
 */
export function FamilyPage({ header, onRefresh, children }: FamilyPageProps) {
  const pull = usePullRefresh(onRefresh);
  return (
    <View style={{ flex: 1 }}>
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
      <SwitchNotice />
    </View>
  );
}
