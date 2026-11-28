import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { CheckboxRow } from './CheckboxRow';
import type { CheckboxProps } from './Checkbox.types';
import { useCheckbox } from './use-checkbox';

/**
 * One tick box and its row, the box drawn in the brand. iOS keeps it too: it has no checkbox
 * control, and @expo/ui's universal one becomes a switch there, a different control.
 */
export function Checkbox(props: CheckboxProps) {
  const { box, tick } = useCheckbox(props);
  return (
    <CheckboxRow
      {...props}
      box={
        <View testID="checkbox-box" style={box}>
          {props.checked && (
            <Svg testID="checkbox-tick" viewBox="0 0 16 16" width="100%" height="100%">
              <Path
                d="M3 8.5 6.5 12 13 4.5"
                fill="none"
                stroke={tick}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          )}
        </View>
      }
    />
  );
}
