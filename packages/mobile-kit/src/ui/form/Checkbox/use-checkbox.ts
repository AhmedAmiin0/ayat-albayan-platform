import { useTheme } from '../../../theme';
import { boxStyle } from './checkbox.style';
import type { CheckboxLook, CheckboxProps } from './Checkbox.types';

export function useCheckbox({ checked }: CheckboxProps): CheckboxLook {
  const { color } = useTheme();
  const edge = checked ? color.lapisFill : color.ruleInput;
  return {
    box: boxStyle(checked ? color.lapisFill : 'transparent', edge),
    tick: color.onLapis,
    colors: {
      checkedColor: color.lapisFill,
      uncheckedColor: color.ruleInput,
      checkmarkColor: color.onLapis,
    },
  };
}
