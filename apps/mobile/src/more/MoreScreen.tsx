import type { Permission } from '@ab/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { t } from '@/lib/i18n';
import { Button } from '@/ui/Button';
import { ListRow } from '@/ui/ListRow';
import { Screen } from '@/ui/Screen';
import { ScreenHeader } from '@/ui/ScreenHeader';
import { AdminOpsSection } from './AdminOpsSection';
import { AppearancePicker } from './AppearancePicker';
import { LanguageRow } from './LanguageRow';
import { MoneySection } from './MoneySection';
import { signOutDevice } from './sign-out';

/**
 * «المزيد» (R-MOB-02): the read-only lists that don't earn a tab («الجدول» is its own tab now),
 * the price calculator, the appearance, the language, sign-out.
 */
export function MoreScreen({ can = () => true }: { can?: (permission: Permission) => boolean }) {
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
        {/* Dynamic roles: each list shows only when the held role grants it. */}
        {can('teachers.read') && <ListRow title={t.nav.teachers} onPress={() => router.push('/more/teachers')} />}
        {can('applicants.read') && <ListRow title={t.nav.jobApplicants} onPress={() => router.push('/more/job-applicants')} />}
        {can('feedback.read') && <ListRow title={t.mobile.feedback.title} onPress={() => router.push('/more/feedback')} />}
        {can('pricing.read') && <ListRow title={t.pricing.title} onPress={() => router.push('/more/pricing')} />}
      </View>
      <MoneySection />
      <AdminOpsSection />
      <AppearancePicker />
      <LanguageRow />
      <View style={{ alignItems: 'flex-start' }}>
        <Button variant="ghost" label={t.auth.logout} onPress={logout} busy={leaving} />
      </View>
    </Screen>
  );
}
