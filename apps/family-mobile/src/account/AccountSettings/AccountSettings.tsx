import { View } from 'react-native';
import {
  AppearancePicker,
  AppText,
  BiometricSwitchRow,
  InsetGroup,
  LanguageRow,
  t,
  type,
  useTheme,
} from '@ab/mobile-kit';
import { PushSwitchRow } from '@/account/PushSwitchRow';
import type { AccountSettingsProps } from './AccountSettings.types';

export function AccountSettings({ student }: AccountSettingsProps) {
  const { color } = useTheme();
  const A = t.portal.app.account;
  return (
    <View style={{ gap: 8 }}>
      <AppText style={{ fontFamily: type.ui[700], fontSize: type.size.sm, color: color.ink2 }}>
        {A.settings}
      </AppText>
      <InsetGroup>
        <PushSwitchRow hint={student ? A.pushStudent : A.pushGuardian} />
      </InsetGroup>
      <BiometricSwitchRow />
      <AppearancePicker />
      <LanguageRow />
    </View>
  );
}
