import { AccountHeaderAvatar } from '@/account/components/AccountHeaderAvatar';
import { AccountRow } from '@/account/components/AccountRow';
import {
  t,
  BiometricSwitchRow,
  SignOutButton,
  Screen,
  ScreenHeader,
  InsetGroup,
  AppearancePicker,
} from '@ab/mobile-kit';
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
      <BiometricSwitchRow />
      <LanguageRow />
      <SignOutButton />
    </Screen>
  );
}
