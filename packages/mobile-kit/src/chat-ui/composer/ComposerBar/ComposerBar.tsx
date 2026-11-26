import type { ReactNode } from 'react';
import { View } from 'react-native';
import { shape, useTheme } from '../../../theme';

export interface ComposerBarProps {
  /** The pill's contents in reading order (emoji · text box · attach…), or a recording bar. */
  pill: ReactNode;
  /** The round button at the row's end (RoundAction, maybe wrapped in a hold). */
  action: ReactNode;
  /** A line over the row (a voice note's state). */
  above?: ReactNode;
  /** The pill's least height: 44pt (the staff inbox) unless given (the channel's 48). */
  size?: number;
}

const PILL = {
  flex: 1,
  flexDirection: 'row',
  alignItems: 'flex-end',
  minHeight: shape.control.touch,
  borderRadius: shape.radius.pill,
  borderWidth: 1,
  paddingHorizontal: 2,
} as const;

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
