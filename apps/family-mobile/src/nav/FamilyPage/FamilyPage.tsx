import { RefreshControl, ScrollView, View } from 'react-native';
import { Screen } from '@ab/mobile-kit';
import type { FamilyPageProps } from './FamilyPage.types';
import { SwitchNotice } from './SwitchNotice';
import { useFamilyPage } from './use-family-page';

/**
 * A family screen: its header over a scrolling body with pull to refresh (docs/50 §6), and the
 * note after a child switch floating at the bottom while it shows (no shift of the page).
 */
export function FamilyPage({ header, onRefresh, children }: FamilyPageProps) {
  const { pull } = useFamilyPage(onRefresh);
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
