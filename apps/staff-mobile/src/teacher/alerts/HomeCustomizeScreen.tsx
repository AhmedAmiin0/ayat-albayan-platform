import { type PrefSwitch, prefSwitches } from '@ab/client-core';
import { router } from 'expo-router';
import { ScrollView } from 'react-native';
import { t, Screen, ScreenHeader, BackButton, InsetGroup } from '@ab/mobile-kit';
import { Note } from '@/core/ui/feedback/Note';
import { saveHomePrefs, useHomePrefs } from './home-prefs';
import { PrefSwitchRow } from './PrefSwitchRow';

function Group({ rows, testID }: { rows: readonly PrefSwitch[]; testID: string }) {
  return (
    <InsetGroup testID={testID}>
      {rows.map((row) => (
        <PrefSwitchRow
          key={row.id}
          label={row.label}
          value={row.value}
          onChange={(on) => saveHomePrefs(row.next(on))}
        />
      ))}
    </InsetGroup>
  );
}

/** Every switch applies at once and is saved on this device only. */
export function HomeCustomizeScreen() {
  const groups = prefSwitches(useHomePrefs(), t.teacherAlerts);
  return (
    <Screen>
      <ScrollView
        style={{ flex: 1, marginHorizontal: -16 }}
        contentContainerStyle={{ gap: 16, paddingHorizontal: 16, paddingBottom: 32 }}
      >
        <ScreenHeader
          title={t.teacherAlerts.customizeTitle}
          size="h2"
          leading={<BackButton onPress={() => router.back()} />}
        />
        <Group rows={groups.alerts} testID="customize-alerts" />
        <Group rows={groups.display} testID="customize-display" />
        <Note>{t.teacherAlerts.savedHere}</Note>
      </ScrollView>
    </Screen>
  );
}
