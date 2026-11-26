import type { ReactNode } from 'react';
import { Pressable } from 'react-native';
import { shape, useTheme } from '../../../theme';
import { pressScale } from '../../../ui/primitives/Button';
import { PauseIcon, PlayIcon } from '../../icons/chat-glyphs';
import { Spinner } from '../Spinner';

interface VoiceButtonProps {
  playing: boolean;
  /** Fetching the URL or buffering: the ring in place of the icon. */
  busy: boolean;
  label: string;
  onPress: () => void;
  onLongPress?: () => void;
}

type Glyph = 'busy' | 'pause' | 'play';

function glyphOf({ busy, playing }: VoiceButtonProps): Glyph {
  if (busy) return 'busy';
  return playing ? 'pause' : 'play';
}

const GLYPH: Record<Glyph, (ink: string) => ReactNode> = {
  busy: (ink) => <Spinner color={ink} />,
  pause: (ink) => <PauseIcon color={ink} />,
  play: (ink) => <PlayIcon color={ink} />,
};

/** WhatsApp's round play / pause (a 44 pt circle in the brand colour). */
export function VoiceButton(p: VoiceButtonProps) {
  const { color } = useTheme();
  return (
    <Pressable
      testID="voice-button"
      accessibilityRole="button"
      accessibilityLabel={p.label}
      accessibilityState={{ busy: p.busy }}
      onPress={p.onPress}
      onLongPress={p.onLongPress}
      style={({ pressed }) => ({
        width: shape.control.touch,
        height: shape.control.touch,
        borderRadius: shape.radius.pill,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: pressed ? color.lapisHover : color.lapisFill,
        transform: [{ scale: pressScale(pressed, false) }],
      })}
    >
      {GLYPH[glyphOf(p)](color.onLapis)}
    </Pressable>
  );
}
