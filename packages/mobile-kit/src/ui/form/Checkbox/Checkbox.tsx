import ExpoCheckbox from 'expo-checkbox';
import { Pressable, View } from 'react-native';
import { useTheme } from '../../../theme';
import { boxStyle, rowStyle } from './checkbox.style';
import type { CheckboxProps } from './Checkbox.types';

/**
 * One tick box and its row. The row is the touch target and the one accessible checkbox; the box
 * itself is drawn by expo-checkbox and hidden from touch and the screen reader.
 */
export function Checkbox(props: CheckboxProps) {
  const { color } = useTheme();
  const { checked, onChange, label, hint, disabled, side = 'start', children } = props;
  const inset = props.inset ?? false;
  const box = (
    <ExpoCheckbox
      testID="checkbox-box"
      value={checked}
      color={checked ? color.lapisFill : color.ruleInput}
      style={boxStyle}
      pointerEvents="none"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    />
  );
  const body = <View style={{ flex: 1 }}>{children}</View>;
  return (
    <Pressable
      testID={props.testID}
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ checked, disabled }}
      disabled={disabled}
      onPress={() => onChange(!checked)}
      style={({ pressed }) =>
        rowStyle({ pressed, disabled: disabled ?? false, inset, wash: color.sunk })
      }
    >
      {side === 'start' ? box : body}
      {side === 'start' ? body : box}
    </Pressable>
  );
}
