import { View } from 'react-native';
import { AccountHeaderAvatar } from '@/account/AccountHeaderAvatar';
import { AccountRow } from '@/account/AccountRow';
import { t } from '@/core/lib/i18n/i18n';
import { AppearancePicker } from '@/more/AppearancePicker';
import { LanguageRow } from '@/more/LanguageRow';
import { SignOutButton } from '@/teacher/SignOutButton';
import { Screen } from '@/core/ui/layout/Screen';
import { ScreenHeader } from '@/core/ui/layout/ScreenHeader';

/** The classroom assistant's «المزيد»: «حسابي» (R-ACC-01), the appearance, the language and sign-out. */
export function AssistantMoreScreen() {
  return (
    <Screen scroll>
      <ScreenHeader
        title={t.mobile.more}
        subtitle={t.mobileRoles.assistantRole}
        trailing={<AccountHeaderAvatar href="/assistant/more/account" />}
      />
      <View style={{ marginHorizontal: -16 }}>
        <AccountRow href="/assistant/more/account" />
      </View>
      <AppearancePicker />
      <LanguageRow />
      <SignOutButton />
    </Screen>
  );
}
