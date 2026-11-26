import { View } from 'react-native';
import { Notice } from '@ab/mobile-kit';
import { useSwitchNotice } from './use-switch-notice';

/** The note after a child switch, floating over the page just above the tab bar (SwitchDone). */
export function SwitchNotice() {
  const { notice, bottom } = useSwitchNotice();
  if (!notice) return null;
  return (
    <View
      testID="switch-notice"
      pointerEvents="none"
      style={{ position: 'absolute', start: 16, end: 16, bottom }}
    >
      <Notice message={notice} />
    </View>
  );
}
