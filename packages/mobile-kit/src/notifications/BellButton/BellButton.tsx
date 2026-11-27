import { Pressable } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '../../theme';
import { BellBadge } from '../BellBadge';
import type { BellButtonProps } from './BellButton.types';
import { useBellButton } from './use-bell-button';

/**
 * The bell in a Today header (R-NOT-01): a 44pt button with the unread count («9+» above nine) at
 * its top corner. The spoken name carries the count; the drawn badge is hidden from it.
 */
export function BellButton({ onPress, round }: BellButtonProps) {
  const { color } = useTheme();
  const { badge, label, pressStyle } = useBellButton({ round });
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={pressStyle}
    >
      <Svg
        viewBox="0 0 24 24"
        width={22}
        height={22}
        fill="none"
        stroke={color.ink}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <Path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
        <Path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
      </Svg>
      {badge ? <BellBadge text={badge} /> : null}
    </Pressable>
  );
}
