import { AccountHeaderAvatar } from '@/account/components/AccountHeaderAvatar';
import { AccountRow } from '@/account/components/AccountRow';
import { t, SignOutButton, Screen, ScreenHeader, InsetGroup } from '@ab/mobile-kit';
import { AppearancePicker } from '@/more/appearance/AppearancePicker';
import { ClockFormatPicker } from '@/more';
import { LanguageRow } from '@/more/appearance/LanguageRow';

/** The classroom assistant's «المزيد»: «حسابي» (R-ACC-01), the appearance, the language and sign-out. */
export function AssistantMoreScreen() {
  return (
    <Screen scroll>
      <ScreenHeader
        title={t.mobile.more}
        subtitle={t.mobileRoles.assistantRole}
        trailing={<AccountHeaderAvatar href="/assistant/more/account" />}
      />
      <InsetGroup>
        <AccountRow href="/assistant/more/account" />
      </InsetGroup>
      <AppearancePicker />
      <ClockFormatPicker />
      <LanguageRow />
      <SignOutButton />
    </Screen>
  );
}
