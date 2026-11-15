import { View } from 'react-native';
import { AppearancePicker, AppText, InsetGroup, t, type, useTheme } from '@ab/mobile-kit';
import { PushSwitchRow } from './PushSwitchRow';

/** «الإعدادات»: this phone's notifications (what they cover for this login) and the appearance. */
export function AccountSettings({ student }: { student: boolean }) {
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
      <AppearancePicker />
    </View>
  );
}
