import Svg, { Path } from 'react-native-svg';

/** ✓ beside the child in view (decorative: the row's name says it). */
export function Check({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" accessibilityElementsHidden>
      <Path d="M5 12.5l4.5 4.5L19 7.5" stroke={color} strokeWidth={2.2} strokeLinecap="round" />
    </Svg>
  );
}
