import { Animated } from 'react-native';
import { useTheme } from '../../../theme';
import type { TabPillProps } from './TabPill.types';

/** The grey capsule under the focused tab; `x` moves it there (usePillOffset). */
export function TabPill({ x, width }: TabPillProps) {
  const { glass } = useTheme();
  return (
    <Animated.View
      testID="tab-pill"
      style={{
        position: 'absolute',
        start: 4,
        top: 4,
        bottom: 4,
        width,
        borderRadius: 27,
        backgroundColor: glass.pill.fill,
        boxShadow: glass.pill.shadow,
        transform: [{ translateX: x }],
      }}
    />
  );
}
