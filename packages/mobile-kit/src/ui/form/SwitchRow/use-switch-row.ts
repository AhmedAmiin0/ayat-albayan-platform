import { semantics } from '@expo/ui/jetpack-compose/modifiers';
import { useTheme } from '../../../theme';
import type { SwitchRowProps } from './SwitchRow.types';

/**
 * Compose's switch props. The label is its spoken name (TalkBack reads it with the switch's own
 * role and state); a disabled switch has no callback, so it cannot report a flip.
 */
export function useSwitchRow({ label, value, disabled = false, onChange }: SwitchRowProps) {
  const { color } = useTheme();
  return {
    value,
    enabled: !disabled,
    onCheckedChange: disabled ? undefined : onChange,
    colors: {
      checkedTrackColor: color.lapisFill,
      checkedThumbColor: color.onLapis,
      checkedBorderColor: color.lapisFill,
      uncheckedTrackColor: color.sunk,
      uncheckedThumbColor: color.ruleInput,
      uncheckedBorderColor: color.ruleInput,
    },
    modifiers: [semantics({ contentDescription: label })],
  };
}
