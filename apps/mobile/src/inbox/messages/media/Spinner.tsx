import { ActivityIndicator, View } from 'react-native';
import { useA11yPref } from '@/core/ui/primitives/use-a11y-pref';

/** A loading ring; with Reduce Motion a still one. Decorative: its button or screen says it is busy. */
export function Spinner({ color, size = 22 }: { color: string; size?: number }) {
  const still = useA11yPref('reduceMotion');
  if (!still) return <ActivityIndicator testID="media-spinner" color={color} accessibilityElementsHidden importantForAccessibility="no" />;
  return (
    <View
      testID="media-spinner"
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 2, borderColor: color, opacity: 0.6 }}
    />
  );
}
