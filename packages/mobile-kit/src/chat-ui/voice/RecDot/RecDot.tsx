import { Animated } from 'react-native';
import { useTheme } from '../../../theme';
import { useRecDot } from './use-rec-dot';

/**
 * The red dot of a recording voice note: blinks while recording (static with «Reduce Motion»);
 * the timer and the announcement carry the state too.
 */
export function RecDot() {
  const { color } = useTheme();
  const { blink } = useRecDot();
  return (
    <Animated.View
      testID="rec-dot"
      style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color.bad, opacity: blink }}
    />
  );
}
