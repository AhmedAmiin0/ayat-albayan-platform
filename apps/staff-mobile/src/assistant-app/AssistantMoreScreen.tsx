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
  LanguageRow,
} from '@ab/mobile-kit';
import { ClockFormatPicker } from '@/more';

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
