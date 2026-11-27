import { Animated, View } from 'react-native';
import { raisedCard } from '../../surface/surface';
import { useTheme } from '../../../theme';
import { SkeletonBar } from './SkeletonBar';
import { useSkeletonCard } from './use-skeleton-card';

/** docs/50 §6: still under Reduce Motion; hidden from screen readers, which hear loading once. */
export function SkeletonCard() {
  const { color } = useTheme();
  const { opacity } = useSkeletonCard();
  return (
    <Animated.View
      testID="skeleton-card"
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={{ ...raisedCard(color), flexDirection: 'row', gap: 12, padding: 16, opacity }}
    >
      <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: color.sunk }} />
      <View style={{ flex: 1, gap: 10, justifyContent: 'center' }}>
        <SkeletonBar width="60%" />
        <SkeletonBar width="35%" />
      </View>
    </Animated.View>
  );
}
