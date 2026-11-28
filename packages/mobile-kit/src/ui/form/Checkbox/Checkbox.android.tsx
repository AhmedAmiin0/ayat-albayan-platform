import { Checkbox as MaterialBox } from '@expo/ui/jetpack-compose';
import { testID } from '@expo/ui/jetpack-compose/modifiers';
import { ExpoHost } from '../../surface/ExpoHost';
import { CheckboxRow } from './CheckboxRow';
import type { CheckboxProps } from './Checkbox.types';
import { useCheckbox } from './use-checkbox';

/**
 * The row with Material 3's box in the brand colours and its animated tick, as in the system's
 * own lists. The box has no callback: the row stays the one control that speaks and toggles.
 */
export function Checkbox(props: CheckboxProps) {
  const { colors } = useCheckbox(props);
  return (
    <CheckboxRow
      {...props}
      box={
        <ExpoHost testID="checkbox-host">
          <MaterialBox value={props.checked} colors={colors} modifiers={[testID('checkbox-box')]} />
        </ExpoHost>
      }
    />
  );
}
