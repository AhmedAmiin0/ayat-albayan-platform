import { I18nManager, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

// Leading icons for Buttons (docs/07 §6), drawn as the chat's line icons (24 grid, 1.75 stroke) at
// 18pt in the label's colour. Decorative: the Button's label names the action.
function Stroke({ color, d }: { color: string; d: string }) {
  return (
    <Svg
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      viewBox="0 0 24 24"
      width={18}
      height={18}
      fill="none"
      stroke={color}
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d={d} />
    </Svg>
  );
}

/** «انسخ الرابط»: two overlapping sheets (the chat's «نسخ الرقم»). */
export const copyIcon = (color: string) => (
  <Stroke color={color} d="M9 9h10a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V10a1 1 0 0 1 1-1ZM16 9V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" />
);

/** «افتح الرابط»: a box with an arrow leaving it toward the inline-end, mirrored in Arabic. */
export const openIcon = (color: string) => (
  <View style={{ transform: [{ scaleX: I18nManager.isRTL ? -1 : 1 }] }}>
    <Stroke color={color} d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
  </View>
);
