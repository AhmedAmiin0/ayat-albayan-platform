import type { PressableStateCallbackType, ViewStyle } from 'react-native';
import { raisedCard, type Palette } from '@ab/mobile-kit';

/** The lapis wash shows at once under the finger; the card's own layout wins. */
export const cardStyle =
  (color: Pick<Palette, 'raised' | 'rule' | 'lapisWash'>, style?: ViewStyle) =>
  ({ pressed }: PressableStateCallbackType): ViewStyle => ({
    ...raisedCard(color, 16),
    backgroundColor: pressed ? color.lapisWash : color.raised,
    padding: 16,
    gap: 12,
    ...style,
  });
