import ExpoCheckbox from 'expo-checkbox';
import { Pressable, View } from 'react-native';
import { boxStyle } from './checkbox.style';
import type { CheckboxProps } from './Checkbox.types';
import { useCheckbox } from './use-checkbox';

/**
 * One tick box and its row. The row is the touch target and the one accessible checkbox; the box
 * itself is drawn by expo-checkbox and hidden from touch and the screen reader.
 */
export function Checkbox(props: CheckboxProps) {
  const { boxColor, onPress, style } = useCheckbox(props);
  return (
    <Pressable
      testID={props.testID}
      accessibilityRole="checkbox"
      accessibilityLabel={props.label}
      accessibilityHint={props.hint}
      accessibilityState={{ checked: props.checked, disabled: props.disabled }}
      disabled={props.disabled}
      onPress={onPress}
      style={style}
    >
      <ExpoCheckbox
        testID="checkbox-box"
        value={props.checked}
        color={boxColor}
        style={boxStyle}
        pointerEvents="none"
        accessible={false}
        importantForAccessibility="no-hide-descendants"
      />
      <View style={{ flex: 1 }}>{props.children}</View>
    </Pressable>
  );
}
