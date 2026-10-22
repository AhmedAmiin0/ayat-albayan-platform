import { router } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { useHolds, useIsAdmin } from '@/auth/use-permissions';
import { ErrorLine } from '@/inbox/ErrorLine';
import { t } from '@/lib/i18n';
import { Note } from '@/more/Note';
import { Button } from '@/ui/Button';
import { ErrorState } from '@/ui/ErrorState';
import { Screen } from '@/ui/Screen';
import { ScreenHeader } from '@/ui/ScreenHeader';
import { GoogleSyncCard } from './GoogleSyncCard';
import { ReadOnlySettings } from './ReadOnlySettings';
import { SettingsFields } from './SettingsFields';
import { useSettings } from './use-settings';
import { useSettingsForm } from './use-settings-form';
import type { AcademySettings } from '@ab/shared';

const back = () => (router.canGoBack() ? router.back() : router.replace('/more'));

function Editor({ settings }: { settings: AcademySettings }) {
  const f = useSettingsForm(settings);
  // The Google card is the admins' (settings.read AND base-role admin, as the API checks; strict: no request before /auth/me answers).
  const holds = useHolds('settings.read');
  const admin = useIsAdmin();
  const google = holds && admin;
  const failed = f.notice !== null && f.notice !== t.settings.saved;
  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ gap: 20, paddingBottom: 32 }}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
    >
      <SettingsFields form={f.form} errors={f.errors} set={f.set} />
      {f.dirty ? <Note>{t.mobileAdmin.settings.unsaved}</Note> : null}
      {f.notice ? failed ? <ErrorLine message={f.notice} /> : <Note>{f.notice}</Note> : null}
      <View style={{ gap: 8, alignItems: 'flex-start' }}>
        <Button label={t.common.save} busy={f.saving} disabled={!f.dirty} onPress={f.submit} />
        {f.dirty ? (
          <Button variant="ghost" label={t.mobileAdmin.settings.discard} onPress={f.discard} />
        ) : null}
      </View>
      <ReadOnlySettings settings={settings} />
      {google ? <GoogleSyncCard /> : null}
    </ScrollView>
  );
}

/**
 * «إعدادات الأكاديمية» (R-SCH-07, R-SCH-02): the six settings the owner edits from the phone, on
 * GET/PATCH /settings. The messaging switches, the CRM cut-over and the Google sync status
 * (docs/24 §3) are read-only here.
 */
export function SettingsScreen() {
  const query = useSettings();
  return (
    <Screen>
      <ScreenHeader
        title={t.mobileAdmin.settings.title}
        subtitle={t.mobileAdmin.settings.subtitle}
        trailing={<Button variant="ghost" label={t.common.back} onPress={back} />}
      />
      {query.data ? (
        <Editor settings={query.data} />
      ) : query.isError ? (
        <ErrorState onRetry={() => void query.refetch()} />
      ) : null}
    </Screen>
  );
}
