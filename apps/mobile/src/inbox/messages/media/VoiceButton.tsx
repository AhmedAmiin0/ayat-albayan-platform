import { Pressable } from 'react-native';
import { shape, useTheme } from '@/theme';
import { pressScale } from '@/core/ui/primitives/Button';
import { PauseIcon, PlayIcon } from '../../shared/chat-icons';
import { Spinner } from './Spinner';

interface VoiceButtonProps {
  playing: boolean;
  /** Fetching the URL or buffering: the ring in place of the icon. */
  busy: boolean;
  label: string;
  onPress: () => void;
}

/** WhatsApp's round play / pause (a 44 pt circle in the brand colour). */
export function VoiceButton({ playing, busy, label, onPress }: VoiceButtonProps) {
  const { color } = useTheme();
  return (
    <Pressable
      testID="voice-button"
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ busy }}
      onPress={onPress}
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
      {busy ? <Spinner color={color.onLapis} /> : playing ? <PauseIcon color={color.onLapis} /> : <PlayIcon color={color.onLapis} />}
    </Pressable>
  );
}
