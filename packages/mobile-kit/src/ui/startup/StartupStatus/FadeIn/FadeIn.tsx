import { Animated } from 'react-native';
import type { FadeInProps } from './FadeIn.types';
import { useFadeIn } from './use-fade-in';

/** Words and the retry appear with a short opacity fade. */
export function FadeIn({ children, gap = 0 }: FadeInProps) {
  const { opacity } = useFadeIn();
  return <Animated.View style={{ opacity, alignItems: 'center', gap }}>{children}</Animated.View>;
}
