import { View } from 'react-native';
import { useTheme } from '../../../../theme';
import { AppText } from '../../../primitives/AppText';
import { frameStyle, labelStyle, lineStyle } from './switch-frame.style';
import type { SwitchFrameProps } from './SwitchFrame.types';

/** A 56pt settings row: the label, the switch at the end, a note below. */
export function SwitchFrame({ label, control, note, testID }: SwitchFrameProps) {
  const { color } = useTheme();
  return (
    <View testID={testID} style={frameStyle}>
      <View style={lineStyle}>
        <AppText style={labelStyle(color.ink)}>{label}</AppText>
        {control}
      </View>
      {note}
    </View>
  );
}
