import type { PressableStateCallbackType, ViewStyle } from 'react-native';
import { shape, type Palette } from '../../../theme';
import { pressScale } from '../../primitives/Button';

type RetryColors = Pick<Palette, 'lapisHover' | 'lapisFill'>;

export const retryPressStyle =
  (color: RetryColors) =>
  ({ pressed }: PressableStateCallbackType): ViewStyle => ({
    height: 48,
    paddingHorizontal: 28,
    borderRadius: shape.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: pressed ? color.lapisHover : color.lapisFill,
    transform: [{ scale: pressScale(pressed, false) }],
  });
