import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useHolds, useIsAdmin } from '@/auth/use-permissions';
import { t } from '@/lib/i18n';
import { Note } from '@/more/Note';
import { useTheme } from '@/theme';
import { Button } from '@/core/ui/primitives/Button';
import { Chevron } from '@/core/ui/primitives/Chevron';
import { ListRow } from '@/core/ui/layout/ListRow';
import { NuqtaGlyph } from '@/core/ui/primitives/NuqtaGlyph';
import { Screen } from '@/core/ui/layout/Screen';
import { ScreenHeader } from '@/core/ui/layout/ScreenHeader';
import { toneColors } from '@/core/ui/feedback/StatusChip';
import { useSettings } from './use-settings';

const back = () => (router.canGoBack() ? router.back() : router.replace('/more'));

export const SETTINGS_HREF = {
  values: '/more/ops/settings/values',
  communications: '/more/ops/settings/communications',
  google: '/more/ops/settings/google',
  savedReplies: '/more/ops/settings/saved-replies',
} as const;

/**
 * «إرسال الرسائل: متوقف»: the dangerous state is on the list, never hidden behind a row (docs/26b
 * §5.4), with its nuqta (struck = stopped, fill = on): shape says it, colour only confirms it.
 */
function useSendLine(): { text: string; glyph: ReactNode } | undefined {
  const { color } = useTheme();
  const data = useSettings().data;
  if (!data) return undefined;
  const on = data.messaging_enabled;
  const state = on ? t.numbers.chips.enabled : t.numbers.chips.disabled;
  const fg = toneColors(color, on ? 'ok' : 'neutral').fg;
  return {
    text: t.settingsPages.sendingState.replace('{state}', state),
    glyph: <NuqtaGlyph shape={on ? 'fill' : 'struck'} color={fg} />,
  };
}

/**
 * «الإعدادات» (docs/26b §4, R-MSG-01): the list that /more/ops/settings opens (push deep links land
 * here). «القيم», «التواصل», «الردود السريعة» (saved_replies.manage) and «مزامنة Google» open their
 * screens; «التكاملات» is a line only:
 * credentials stay on the website.
 */
export function SettingsScreen() {
  const { color } = useTheme();
  // The Google screen is the admins' (settings.read AND base-role admin, as the API checks).
  const holds = useHolds('settings.read');
  const admin = useIsAdmin();
  const google = holds && admin;
  const replies = useHolds('saved_replies.manage');
  const sendLine = useSendLine();
  const next = <Chevron to="next" color={color.ink3} />;
  return (
    <Screen scroll>
      <ScreenHeader
        title={t.settingsHub.title}
        trailing={<Button variant="ghost" label={t.common.back} onPress={back} />}
      />
      <View style={{ marginHorizontal: -16 }}>
        <ListRow
          title={t.mobileValues.title}
          trailing={next}
          onPress={() => router.push(SETTINGS_HREF.values)}
        />
        <ListRow
          title={t.settingsPages.communications}
          subtitle={sendLine?.text}
          subtitleLeading={sendLine?.glyph}
          trailing={next}
          onPress={() => router.push(SETTINGS_HREF.communications)}
        />
        {replies ? (
          <ListRow
            title={t.savedReplies.title}
            trailing={next}
            onPress={() => router.push(SETTINGS_HREF.savedReplies)}
          />
        ) : null}
        {google ? (
          <ListRow
            title={t.googleSync.mobile.title}
            trailing={next}
            onPress={() => router.push(SETTINGS_HREF.google)}
          />
        ) : null}
        <ListRow
          title={t.mobileValues.integrations}
          trailing={<Note>{t.mobileValues.integrationsNote}</Note>}
        />
      </View>
      <Note>{t.mobileValues.integrationsHint}</Note>
    </Screen>
  );
}
