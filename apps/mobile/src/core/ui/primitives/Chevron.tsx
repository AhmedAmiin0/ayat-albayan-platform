import { I18nManager } from 'react-native';
import Svg, { Path } from 'react-native-svg';

interface ChevronProps {
  /** prev = towards the inline-start (left in LTR, right in RTL); next = towards the inline-end. */
  to: 'prev' | 'next';
  color: string;
  size?: number;
}

/**
 * A directional chevron drawn as a path, so it never depends on how the text engine mirrors ‹ ›
 * (a Bidi_Mirrored glyph plus a scaleX flip pointed both arrows the wrong way in RTL). The path
 * points left; it is flipped when that is not where it should point. Decorative: the button names it.
 */
export function Chevron({ to, color, size = 18 }: ChevronProps) {
  const flip = (to === 'next') !== I18nManager.isRTL;
  return (
    <Svg
      testID={`chevron-${to}`}
      viewBox="0 0 16 16"
      width={size}
      height={size}
      style={{ transform: [{ scaleX: flip ? -1 : 1 }] }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Path d="M10 3 5 8l5 5" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
