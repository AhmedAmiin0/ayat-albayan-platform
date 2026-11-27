import { View } from 'react-native';
import type { ConnectingDotsProps } from './ConnectingDots.types';
import { DOTS } from './connecting-dots.helpers';
import { Dot } from './Dot';

/**
 * Three round dots in a wave, staggered 0 / 150 / 300 ms in reading order: the row follows the layout
 * direction, so in Arabic the wave runs right to left. Decorative (the words beside them speak).
 */
export function ConnectingDots({ color, still }: ConnectingDotsProps) {
  return (
    <View
      style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {DOTS.map((i) => (
        <Dot key={i} index={i} color={color} still={still} />
      ))}
    </View>
  );
}
