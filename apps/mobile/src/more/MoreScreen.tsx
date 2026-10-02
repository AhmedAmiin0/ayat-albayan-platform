import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { t } from '@/lib/i18n';
import { Button } from '@/ui/Button';
import { ListRow } from '@/ui/ListRow';
import { Screen } from '@/ui/Screen';
import { ScreenHeader } from '@/ui/ScreenHeader';
import { AppearancePicker } from './AppearancePicker';
import { LanguageRow } from './LanguageRow';
import { signOutDevice } from './sign-out';

/**
 * «المزيد» (R-MOB-02): «الجدول» (every teacher's day), the read-only lists that don't earn a tab,
 * the price calculator, the appearance, the language, sign-out.
 */
export function MoreScreen() {
  const [leaving, setLeaving] = useState(false);
  const logout = () => {
    setLeaving(true);
    // On success the gate unmounts this screen; signOut failing locally still clears the session.
    void signOutDevice().finally(() => setLeaving(false));
  };
  return (
    <Screen>
      <ScreenHeader title={t.mobile.more} />
      <View style={{ marginHorizontal: -16 }}>
        <ListRow title={t.schedule.nav} onPress={() => router.push('/more/teachers/schedule')} />
        <ListRow title={t.nav.teachers} onPress={() => router.push('/more/teachers')} />
        <ListRow title={t.nav.jobApplicants} onPress={() => router.push('/more/job-applicants')} />
        <ListRow title={t.pricing.title} onPress={() => router.push('/more/pricing')} />
      </View>
      <AppearancePicker />
      <LanguageRow />
      <View style={{ alignItems: 'flex-start' }}>
        <Button variant="ghost" label={t.auth.logout} onPress={logout} busy={leaving} />
      </View>
    </Screen>
  );
}
