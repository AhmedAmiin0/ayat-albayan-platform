import type { Permission } from '@ab/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { AccountHeaderAvatar } from '@/account/components/AccountHeaderAvatar';
import { AccountRow } from '@/account/components/AccountRow';
import { t } from '@/core/lib/i18n/i18n';
import { SalesSection } from '@/sales/components/SalesSection';
import { Button } from '@/core/ui/primitives/Button';
import { ListRow } from '@/core/ui/layout/ListRow';
import { Screen } from '@/core/ui/layout/Screen';
import { ScreenHeader } from '@/core/ui/layout/ScreenHeader';
import { AdminOpsSection } from '@/more/sections/AdminOpsSection';
import { AppearancePicker } from '@/more/appearance/AppearancePicker';
import { ClockFormatPicker } from '@/more/appearance/ClockFormatPicker';
import { ClassroomSection } from '@/more/sections/ClassroomSection';
import { FinanceSection } from '@/more/sections/FinanceSection';
import { LanguageRow } from '@/more/appearance/LanguageRow';
import { MoneySection } from '@/more/sections/MoneySection';
import { signOutDevice } from '@/core/lib/session/sign-out';
import { InsetGroup } from '@/core/ui/surface/inset';

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
    <Screen scroll>
      <ScreenHeader title={t.mobile.more} trailing={<AccountHeaderAvatar href="/more/account" />} />
      <InsetGroup>
        {/* «حسابي» for every role (sales included: they share these tabs); the rest by permission. */}
        <AccountRow href="/more/account" />
        {/* Dynamic roles: each list shows only when the held role grants it. */}
        {can('teachers.read') && <ListRow title={t.nav.teachers} onPress={() => router.push('/more/teachers')} />}
        {can('applicants.read') && <ListRow title={t.nav.jobApplicants} onPress={() => router.push('/more/job-applicants')} />}
        {can('feedback.read') && <ListRow title={t.mobile.feedback.title} onPress={() => router.push('/more/feedback')} />}
        {can('pricing.read') && <ListRow title={t.pricing.title} onPress={() => router.push('/more/pricing')} />}
        {can('users.read') && <ListRow title={t.users.nav} onPress={() => router.push('/more/users')} />}
      </InsetGroup>
      <SalesSection can={can} />
      <MoneySection can={can} />
      <AdminOpsSection can={can} />
      <FinanceSection can={can} />
      <ClassroomSection can={can} />
      <AppearancePicker />
      <ClockFormatPicker />
      <LanguageRow />
      <View style={{ alignItems: 'flex-start' }}>
        <Button variant="ghost" label={t.auth.logout} onPress={logout} busy={leaving} />
      </View>
    </Screen>
  );
}
