import { type PrefSwitch, prefSwitches } from '@ab/client-core';
import { router } from 'expo-router';
import { ScrollView } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/core/ui/feedback/Note';
import { Screen } from '@/core/ui/layout/Screen';
import { ScreenHeader } from '@/core/ui/layout/ScreenHeader';
import { BackButton } from '@/core/ui/navigation';
import { InsetGroup } from '@/core/ui/surface/inset';
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

/**
 * «تخصيص صفحة اليوم» (owner 2026-11-14): each alert kind, the hero, the ended lessons and compact
 * rows. Every switch applies at once and is saved on this device only.
 */
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
