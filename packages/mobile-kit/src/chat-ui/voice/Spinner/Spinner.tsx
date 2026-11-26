import { ActivityIndicator, View } from 'react-native';
import { useA11yPref } from '../../../ui/primitives/use-a11y-pref';

const HIDDEN = { accessibilityElementsHidden: true, importantForAccessibility: 'no' } as const;

/**
 * A loading ring; with Reduce Motion a still one. Decorative: its button or screen says it is busy.
 */
export function Spinner({ color, size = 22 }: { color: string; size?: number }) {
  const still = useA11yPref('reduceMotion');
  if (!still) {
    const big = size >= 32 ? 'large' : 'small';
    return <ActivityIndicator testID="media-spinner" size={big} color={color} {...HIDDEN} />;
  }
  return (
    <View
      testID="media-spinner"
      {...HIDDEN}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 2,
        borderColor: color,
        opacity: 0.6,
      }}
    />
  );
}
