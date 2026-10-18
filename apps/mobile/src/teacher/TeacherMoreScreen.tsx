import { teacherName } from '@ab/shared';
import { router } from 'expo-router';
import { View } from 'react-native';
import { AccountHeaderAvatar } from '@/account/AccountHeaderAvatar';
import { AccountRow } from '@/account/AccountRow';
import { t } from '@/lib/i18n';
import { AppearancePicker } from '@/more/AppearancePicker';
import { LanguageRow } from '@/more/LanguageRow';
import { ListRow } from '@/ui/ListRow';
import { Screen } from '@/ui/Screen';
import { ScreenHeader } from '@/ui/ScreenHeader';
import { useTeacherMe } from './queries';
import { SignOutButton } from './SignOutButton';
import { locale } from '@/lib/locale';

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
