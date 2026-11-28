import { useTheme } from '../../../../theme';
import { rowStyle } from './checkbox-row.style';
import type { CheckboxRowLogic, CheckboxRowProps } from './CheckboxRow.types';

export function useCheckboxRow(props: CheckboxRowProps): CheckboxRowLogic {
  const { color } = useTheme();
  const { checked, onChange } = props;
  const look = {
    disabled: props.disabled ?? false,
    inset: props.inset ?? false,
    side: props.side ?? 'start',
    wash: color.sunk,
  };
  return {
    onPress: () => onChange(!checked),
    style: ({ pressed }) => rowStyle({ ...look, pressed }),
  };
}
