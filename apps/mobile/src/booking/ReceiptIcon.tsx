import Svg, { Path } from 'react-native-svg';
import { useTheme } from '@/theme';

/** The web's receipt line icon (a paper with a torn edge and two lines): for a file with no picture. */
export function ReceiptIcon({ size = 28 }: { size?: number }) {
  const { color } = useTheme();
  return (
    <Svg viewBox="0 0 20 20" width={size} height={size} fill="none" stroke={color.ink2} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Path d="M5.5 3.5h9v13l-1.5-1-1.5 1-1.5-1-1.5 1-1.5-1-1.5 1v-13ZM8 7.5h4M8 10.5h4" />
    </Svg>
  );
}
