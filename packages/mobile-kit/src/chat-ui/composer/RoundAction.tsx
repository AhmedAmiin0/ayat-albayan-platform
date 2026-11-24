import { Animated, View } from 'react-native';
import { t } from '../../lib/i18n/i18n';
import { shape, useTheme } from '../../theme';
import { IconButton } from '../../ui/primitives/IconButton';
import { MicIcon, SendIcon } from '../icons/chat-glyphs';
import { useModeFade } from './use-mode-fade';

export interface RoundActionProps {
  mode: 'mic' | 'send';
  /** Send only: nothing to send, or a send on its way. */
  disabled?: boolean;
  onSend?: () => void;
  /** The circle's side: 44pt (the staff inbox) unless given (the channel's 48). */
  size?: number;
}

const CIRCLE = {
  borderRadius: shape.radius.pill,
  alignItems: 'center',
  justifyContent: 'center',
} as const;

/** Microphone when nothing else to send, else send, mirrored in RTL; Reduce Motion skips fades. */
export function RoundAction(p: RoundActionProps) {
  const { mode, disabled = false, onSend, size = shape.control.touch } = p;
  const { color } = useTheme();
  const fade = useModeFade(mode);
  const Glyph = mode === 'mic' ? MicIcon : SendIcon;
  const icon = (
    <Animated.View style={fade}>
      <Glyph color={color.onLapis} />
    </Animated.View>
  );
  if (mode === 'mic') {
    return (
      <View
        testID="mic-circle"
        style={{ ...CIRCLE, width: size, height: size, backgroundColor: color.lapisFill }}
      >
        {icon}
      </View>
    );
  }
  return (
    <IconButton
      variant="filled"
      label={t.inbox.composer.send}
      disabled={disabled}
      size={size}
      onPress={() => onSend?.()}
    >
      {icon}
    </IconButton>
  );
}
