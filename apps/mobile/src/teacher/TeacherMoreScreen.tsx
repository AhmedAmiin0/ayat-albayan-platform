import { teacherName } from '@ab/shared';
import { router } from 'expo-router';
import { View } from 'react-native';
import { AccountHeaderAvatar } from '@/account/components/AccountHeaderAvatar';
import { AccountRow } from '@/account/components/AccountRow';
import { t } from '@/core/lib/i18n/i18n';
import { AppearancePicker } from '@/more/appearance/AppearancePicker';
import { LanguageRow } from '@/more/appearance/LanguageRow';
import { ListRow } from '@/core/ui/layout/ListRow';
import { Screen } from '@/core/ui/layout/Screen';
import { ScreenHeader } from '@/core/ui/layout/ScreenHeader';
import { useTeacherMe } from './queries';
import { SignOutButton } from './SignOutButton';
import { locale } from '@/core/lib/i18n/locale';

/**
 * The teacher's «المزيد» (R-TCH-02, R-TCH-04, R-MOB-02): my students (subscribed and trial), my earnings per lesson (monthly statements one tap in), my weekly
 * availability and time-off (read-only; the admin edits them), «حسابي» (R-ACC-01), the appearance, the language,
 * sign-out.
 */
export function TeacherMoreScreen() {
  const me = useTeacherMe();
  return (
    <Screen scroll>
      <ScreenHeader
        title={t.mobile.more}
        subtitle={me.data && teacherName(me.data, locale)}
        trailing={<AccountHeaderAvatar href="/teacher/more/account" />}
      />
      <View style={{ marginHorizontal: -16 }}>
        <AccountRow href="/teacher/more/account" />
        <ListRow title={t.teacherNav.students} onPress={() => router.push('/teacher/more/students')} />
        <ListRow title={t.teacherNav.payouts} onPress={() => router.push('/teacher/more/earnings')} />
        <ListRow title={t.mobile.feedback.title} onPress={() => router.push('/teacher/more/feedback')} />
        <ListRow title={t.mobileClassroom.meetingsRow} onPress={() => router.push('/teacher/more/meetings')} />
        <ListRow title={t.availability.title} onPress={() => router.push('/teacher/more/availability')} />
      </View>
      <AppearancePicker />
      <LanguageRow />
      <SignOutButton />
    </Screen>
  );
}
