import { ALERT_KINDS, type HomePrefs, withAlert } from '@ab/client-core';
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

type Flag = 'hero' | 'ended';
const FLAGS: readonly { key: Flag; label: string }[] = [
  { key: 'hero', label: t.teacherAlerts.hero },
  { key: 'ended', label: t.teacherAlerts.ended },
];

const patch = (prefs: HomePrefs, change: Partial<HomePrefs>) =>
  saveHomePrefs({ ...prefs, ...change });

/**
 * «تخصيص صفحة اليوم» (owner 2026-11-14): each alert kind, the hero, the ended lessons and compact
 * rows. Every switch applies at once and is saved on this device only.
 */
export function HomeCustomizeScreen() {
  const prefs = useHomePrefs();
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
        <InsetGroup testID="customize-alerts">
          {ALERT_KINDS.map((kind) => (
            <PrefSwitchRow
              key={kind}
              label={t.teacherAlerts.kind[kind]}
              value={prefs.alerts[kind]}
              onChange={(on) => saveHomePrefs(withAlert(prefs, kind, on))}
            />
          ))}
        </InsetGroup>
        <InsetGroup testID="customize-display">
          {FLAGS.map((f) => (
            <PrefSwitchRow
              key={f.key}
              label={f.label}
              value={prefs[f.key]}
              onChange={(on) => patch(prefs, { [f.key]: on })}
            />
          ))}
          <PrefSwitchRow
            label={t.teacherAlerts.compact}
            value={prefs.density === 'compact'}
            onChange={(on) => patch(prefs, { density: on ? 'compact' : 'comfortable' })}
          />
        </InsetGroup>
        <Note>{t.teacherAlerts.savedHere}</Note>
      </ScrollView>
    </Screen>
  );
}
