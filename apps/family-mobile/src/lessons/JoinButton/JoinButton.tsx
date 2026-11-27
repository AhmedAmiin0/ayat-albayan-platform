import { Pressable } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { AppText, t, type, useTheme } from '@ab/mobile-kit';
import type { JoinButtonProps } from './JoinButton.types';
import { idleWord, pressStyle } from './join-button.helpers';

/** Busy while the room link is fetched. */
export function JoinButton({ onPress, busy, short = false, live = false }: JoinButtonProps) {
  const { color } = useTheme();
  const label = busy ? t.portal.joining : idleWord(short, live);
  const ink = short ? color.onLapis : color.lapisHover;
  const fill = short ? color.lapisFill : color.onLapis;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ busy, disabled: busy }}
      disabled={busy}
      onPress={onPress}
      style={pressStyle({ short, busy, fill })}
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
        <Path d="M5 6h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z" />
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
