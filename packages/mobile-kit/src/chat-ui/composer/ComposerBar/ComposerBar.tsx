import { View } from 'react-native';
import { useTheme } from '../../../theme';
import type { ComposerBarProps } from './ComposerBar.types';
import { PILL } from './composer-bar.helpers';

/**
 * The WhatsApp-order typing bar: [pill] then the round button, in reading order,
 * so it mirrors with the phone (the round button on the right in English, on the left in Arabic).
 * Presentational only: the caller fills the pill and the action.
 */
export function ComposerBar({ pill, action, above, size }: ComposerBarProps) {
  const { color } = useTheme();
  return (
    <View style={{ gap: 4 }}>
      {above}
      <View testID="open-row" style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6 }}>
        <View
          testID="composer-pill"
          style={{
            ...PILL,
            minHeight: size ?? PILL.minHeight,
            borderColor: color.ruleInput,
            backgroundColor: color.raised,
          }}
        >
          {pill}
        </View>
        <View testID="round-action">{action}</View>
      </View>
    </View>
  );
}
