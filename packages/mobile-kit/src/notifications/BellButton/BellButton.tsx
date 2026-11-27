import { Pressable } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { shape, useTheme } from '../../theme';
import { BellBadge } from '../BellBadge';
import { bellLabel } from '../notifications-cache';
import type { BellButtonProps } from './BellButton.types';
import { useBellButton } from './use-bell-button';

/**
 * The bell in a Today header (R-NOT-01): a 44pt button with the unread count («9+» above nine) at
 * its top corner. The spoken name carries the count; the drawn badge is hidden from it.
 */
export function BellButton({ onPress, round = false }: BellButtonProps) {
  const { color } = useTheme();
  const { unread, badge } = useBellButton();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={bellLabel(unread)}
      onPress={onPress}
      style={({ pressed }) => ({
        width: shape.control.touch,
        height: shape.control.touch,
        borderRadius: round ? shape.control.touch / 2 : shape.radius.md,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: pressed ? color.lapisWash : 'transparent',
      })}
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
