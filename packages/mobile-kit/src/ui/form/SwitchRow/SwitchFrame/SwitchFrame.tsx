import { View } from 'react-native';
import { type, useTheme } from '../../../../theme';
import { AppText } from '../../../primitives/AppText';
import type { SwitchFrameProps } from './SwitchFrame.types';

/** A 56pt settings row: the label, the switch at the end, a note below. */
export function SwitchFrame({ label, control, note, testID }: SwitchFrameProps) {
  const ink = useTheme().color.ink;
  return (
    <View
      testID={testID}
      style={{ minHeight: 56, paddingHorizontal: 16, paddingVertical: 10, gap: 4 }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <AppText
          style={{ flexShrink: 1, fontFamily: type.ui[600], fontSize: type.size.sm, color: ink }}
        >
          {label}
        </AppText>
        {control}
      </View>
      {note}
    </View>
  );
}
