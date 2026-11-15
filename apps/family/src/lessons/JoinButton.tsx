import { Pressable } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { AppText, pressScale, t, type, useTheme } from '@ab/mobile-kit';

interface JoinButtonProps {
  onPress: () => void;
  busy: boolean;
  /** «ادخل» on a schedule row; «ادخل الحلقة» on a card. */
  short?: boolean;
}

/**
 * «ادخل الحلقة» on the lapis card: white, with the camera glyph, the app's press-in; busy while the
 * room link is fetched (the label says so).
 */
export function JoinButton({ onPress, busy, short = false }: JoinButtonProps) {
  const { color } = useTheme();
  const idle = short ? t.portal.app.lesson.joinShort : t.portal.join;
  const label = busy ? t.portal.joining : idle;
  const ink = short ? color.onLapis : color.lapisHover;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ busy, disabled: busy }}
      disabled={busy}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: short ? 36 : 48,
        paddingHorizontal: 14,
        borderRadius: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: short ? color.lapisFill : color.onLapis,
        opacity: busy ? 0.7 : 1,
        transform: [{ scale: pressScale(pressed, busy) }],
      })}
    >
      <Svg
        width={20}
        height={20}
        viewBox="0 0 24 24"
        fill="none"
        stroke={ink}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <Path d="M15 10l4.6-2.3A1 1 0 0 1 21 8.6v6.8a1 1 0 0 1-1.4.9L15 14" />
        <Rect x={3} y={6} width={12} height={12} rx={2} />
      </Svg>
      <AppText
        style={{
          fontFamily: type.ui[700],
          fontSize: type.size.body,
          color: ink,
        }}
      >
        {label}
      </AppText>
    </Pressable>
  );
}
