import { Animated } from 'react-native';
import { useTheme } from '../../../../theme';
import type { RoundIconProps } from './RoundIcon.types';
import { GLYPH } from './round-icon.helpers';

export function RoundIcon({ mode, fade }: RoundIconProps) {
  const { color } = useTheme();
  const Glyph = GLYPH[mode];
  return (
    <Animated.View style={fade}>
      <Glyph color={color.onLapis} />
    </Animated.View>
  );
}
