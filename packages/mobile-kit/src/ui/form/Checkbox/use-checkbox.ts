import { useTheme } from '../../../theme';
import { rowStyle } from './checkbox.style';
import type { CheckboxLogic, CheckboxProps } from './Checkbox.types';

export function useCheckbox(props: CheckboxProps): CheckboxLogic {
  const { color } = useTheme();
  const { checked, onChange } = props;
  const look = {
    disabled: props.disabled ?? false,
    inset: props.inset ?? false,
    side: props.side ?? 'start',
    wash: color.sunk,
  };
  return {
    boxColor: checked ? color.lapisFill : color.ruleInput,
    onPress: () => onChange(!checked),
    style: ({ pressed }) => rowStyle({ ...look, pressed }),
  };
}
