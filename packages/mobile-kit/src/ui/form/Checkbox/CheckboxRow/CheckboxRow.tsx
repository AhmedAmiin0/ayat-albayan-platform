import { Pressable, View } from 'react-native';
import { fill } from './checkbox-row.style';
import type { CheckboxRowProps } from './CheckboxRow.types';
import { useCheckboxRow } from './use-checkbox-row';

/**
 * The row is the touch target and the one accessible checkbox on every platform; the box inside
 * only draws, so each platform's box keeps the same role, name, state and press.
 */
export function CheckboxRow(props: CheckboxRowProps) {
  const { onPress, style } = useCheckboxRow(props);
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
      <View
        pointerEvents="none"
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {props.box}
      </View>
      <View style={fill}>{props.children}</View>
    </Pressable>
  );
}
