import { Animated, View } from 'react-native';
import { t } from '../../lib/i18n/i18n';
import { shape, useTheme } from '../../theme';
import { IconButton } from '../../ui/primitives/IconButton';
import { MicIcon, SendIcon } from '../icons/chat-glyphs';
import { useModeFade } from './use-mode-fade';

export interface RoundActionProps {
  mode: 'mic' | 'send';
  /** «أرسل» only: nothing to send, or a send on its way. */
  disabled?: boolean;
  onSend?: () => void;
}

const CIRCLE = {
  width: shape.control.touch,
  height: shape.control.touch,
  borderRadius: shape.radius.pill,
  alignItems: 'center',
  justifyContent: 'center',
} as const;

/**
 * The round 44pt button at the row's end (owner 2026-10-27, as WhatsApp): the microphone while
 * there
 * is nothing else to send (the caller's hold wraps it), «أرسل» otherwise, its plane mirrored in
 * Arabic. The icon crossfades in 120 ms when the mode changes; not with «Reduce Motion».
 */
export function RoundAction({ mode, disabled = false, onSend }: RoundActionProps) {
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
      <View testID="mic-circle" style={{ ...CIRCLE, backgroundColor: color.lapisFill }}>
        {icon}
      </View>
    );
  }
  return (
    <IconButton
      variant="filled"
      label={t.inbox.composer.send}
      disabled={disabled}
      onPress={() => onSend?.()}
    >
      {icon}
    </IconButton>
  );
}
