import { router } from 'expo-router';
import { View } from 'react-native';
import { t } from '@/lib/i18n';
import { AppearancePicker } from '@/more/AppearancePicker';
import { LanguageRow } from '@/more/LanguageRow';
import { ListRow } from '@/ui/ListRow';
import { Screen } from '@/ui/Screen';
import { ScreenHeader } from '@/ui/ScreenHeader';
import { useTeacherMe } from './queries';
import { SignOutButton } from './SignOutButton';

/**
 * The teacher's «المزيد» (R-TCH-02, R-TCH-04, R-MOB-02): my payouts month by month, my weekly
 * availability and time-off (read-only; the admin edits them), the appearance, the language,
 * sign-out.
 */
export function TeacherMoreScreen() {
  const me = useTeacherMe();
  return (
    <Screen>
      <ScreenHeader title={t.mobile.more} subtitle={me.data?.display_name_ar} />
      <View style={{ marginHorizontal: -16 }}>
        <ListRow title={t.teacherNav.payouts} onPress={() => router.push('/teacher/more/payouts')} />
        <ListRow title={t.mobile.feedback.title} onPress={() => router.push('/teacher/more/feedback')} />
        <ListRow title={t.availability.title} onPress={() => router.push('/teacher/more/availability')} />
      </View>
      <AppearancePicker />
      <LanguageRow />
      <SignOutButton />
    </Screen>
  );
}
