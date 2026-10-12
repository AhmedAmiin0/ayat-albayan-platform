import type { Permission } from '@ab/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { AccountHeaderAvatar } from '@/account/AccountHeaderAvatar';
import { AccountRow } from '@/account/AccountRow';
import { t } from '@/lib/i18n';
import { SalesSection } from '@/sales/SalesSection';
import { Button } from '@/ui/Button';
import { ListRow } from '@/ui/ListRow';
import { Screen } from '@/ui/Screen';
import { ScreenHeader } from '@/ui/ScreenHeader';
import { AdminOpsSection } from './AdminOpsSection';
import { AppearancePicker } from './AppearancePicker';
import { ClassroomSection } from './ClassroomSection';
import { FinanceSection } from './FinanceSection';
import { LanguageRow } from './LanguageRow';
import { MoneySection } from './MoneySection';
import { signOutDevice } from './sign-out';

/**
 * «المزيد» (R-MOB-02): the read-only lists that don't earn a tab («الجدول» is its own tab now),
 * the price calculator, «حسابي» (R-ACC-01), the appearance, the language, sign-out.
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
      <ScreenHeader title={t.mobile.more} trailing={<AccountHeaderAvatar href="/more/account" />} />
      <View style={{ marginHorizontal: -16 }}>
        {/* «حسابي» for every role (sales included: they share these tabs); the rest by permission. */}
        <AccountRow href="/more/account" />
        {/* Dynamic roles: each list shows only when the held role grants it. */}
        {can('teachers.read') && <ListRow title={t.nav.teachers} onPress={() => router.push('/more/teachers')} />}
        {can('applicants.read') && <ListRow title={t.nav.jobApplicants} onPress={() => router.push('/more/job-applicants')} />}
        {can('feedback.read') && <ListRow title={t.mobile.feedback.title} onPress={() => router.push('/more/feedback')} />}
        {can('pricing.read') && <ListRow title={t.pricing.title} onPress={() => router.push('/more/pricing')} />}
      </View>
      <SalesSection can={can} />
      <MoneySection can={can} />
      <AdminOpsSection can={can} />
      <FinanceSection can={can} />
      <ClassroomSection can={can} />
      <AppearancePicker />
      <LanguageRow />
      <View style={{ alignItems: 'flex-start' }}>
        <Button variant="ghost" label={t.auth.logout} onPress={logout} busy={leaving} />
      </View>
    </Screen>
  );
}
